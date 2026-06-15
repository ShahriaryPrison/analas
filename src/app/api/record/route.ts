// Ingestion endpoint for rrweb session-recording chunks.
// Auth: the same Bearer API key used by /api/capture.
// Body: JSON with either `events` (plain array) or `eventsGzip` (base64 gzip of
//       JSON.stringify(events)).
// Each flush is re-encoded to gzipped NDJSON and stored as one immutable chunk
// via the RecordingStore; metadata lives in Postgres.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRecordingStore } from "@/lib/recordings/store";
import { isCloudHosted, getEffectivePlan } from "@/lib/billing/plans";
import crypto from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Strict UUID v4 — also keeps sessionId safe as a path segment.
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// API key → workspaceId/plan cache (5 min TTL, same pattern as /api/capture).
const CACHE_TTL = 5 * 60 * 1000;
const apiCache = new Map<
  string,
  { workspaceId: string; plan: string; allowedDomains: string[]; expiresAt: number }
>();

// Per-key ingest velocity backstop (1-minute window) — caps disk-fill rate.
const RATE_LIMIT = 60;
const rateMap = new Map<string, { ts: number; count: number }>();

// Abuse / resource caps.
const MAX_BODY_BYTES = 2_000_000; // reject oversized compressed payloads (413)
const MAX_DECOMPRESSED_BYTES = 20_000_000; // gunzip guard against zip-bombs
const MAX_EVENTS_PER_CHUNK = 10_000;
const MAX_SESSION_CHUNKS = 5_000; // bound a single never-ending session
const MAX_DURATION = 24 * 60 * 60; // clamp implausible client durations (seconds)
const MAX_ACTIVE_RECORDINGS = Number(process.env.RECORDINGS_MAX_PER_WORKSPACE ?? 50_000);

type RecordBody = {
  sessionId: string;
  distinctId?: string;
  browser?: string;
  os?: string;
  pagePath?: string;
  duration?: number;
  events?: unknown[];
  eventsGzip?: string;
};

export async function POST(req: Request) {
  try {
    // ── Early size guard (before buffering the body) ──────────────────────────
    const declaredLen = Number(req.headers.get("content-length") ?? 0);
    if (declaredLen > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // ── Auth (Bearer only) ────────────────────────────────────────────────────
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }
    const rawKey = auth.replace(/^Bearer\s+/i, "").trim();
    if (!rawKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // ── Rate limit (per key, 1-minute window) ─────────────────────────────────
    const now = Date.now();
    const rl = rateMap.get(keyHash);
    if (!rl || now - rl.ts > 60_000) {
      rateMap.set(keyHash, { ts: now, count: 1 });
    } else {
      rl.count++;
      if (rl.count > RATE_LIMIT) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }
    }

    // ── Resolve workspace (cached) ────────────────────────────────────────────
    let workspaceId: string;
    let plan: string;
    let allowedDomains: string[] = [];

    const cached = apiCache.get(keyHash);
    if (cached && cached.expiresAt > now) {
      workspaceId = cached.workspaceId;
      plan = cached.plan;
      allowedDomains = cached.allowedDomains;
    } else {
      if (rawKey.startsWith("analas_pub_")) {
        const ws = await prisma.workspace.findUnique({
          where: { publicToken: rawKey },
          select: { id: true, plan: true, allowedDomains: true },
        });
        if (!ws) {
          return NextResponse.json({ error: "Invalid client token" }, { status: 401 });
        }
        workspaceId = ws.id;
        plan = ws.plan;
        allowedDomains = ws.allowedDomains;
      } else {
        const apiKey = await prisma.apiKey.findUnique({
          where: { keyHash },
          include: { workspace: { select: { plan: true, allowedDomains: true } } },
        });
        if (!apiKey) {
          return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
        }
        workspaceId = apiKey.workspaceId;
        plan = apiKey.workspace.plan;
        allowedDomains = apiKey.workspace.allowedDomains;
      }
      apiCache.set(keyHash, { workspaceId, plan, allowedDomains, expiresAt: now + CACHE_TTL });
    }

    // ── Origin/Domain Verification ────────────────────────────────────────────
    if (allowedDomains.length > 0) {
      const originHeader = req.headers.get("origin") || req.headers.get("referer") || "";
      if (!originHeader) {
        return NextResponse.json({ error: "Unauthorized: Missing Origin header" }, { status: 403 });
      }

      const cleanOrigin = (urlStr: string): string => {
        try {
          const u = new URL(urlStr);
          return u.hostname.toLowerCase();
        } catch {
          return urlStr
            .trim()
            .toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?/, "")
            .split("/")[0]
            .split(":")[0];
        }
      };

      const clientDomain = cleanOrigin(originHeader);
      const isAllowed = allowedDomains.some(
        (domain) => clientDomain === domain || clientDomain.endsWith("." + domain)
      );

      if (!isAllowed) {
        return NextResponse.json({ error: `Forbidden: Unauthorized origin '${clientDomain}'` }, { status: 403 });
      }
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = (await req.json()) as RecordBody;
    const { sessionId } = body;
    if (!sessionId || !UUID_V4_RE.test(sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    // ── Decode events (with zip-bomb guard) ───────────────────────────────────
    let events: unknown[];
    if (body.eventsGzip) {
      const buf = Buffer.from(body.eventsGzip, "base64");
      if (buf.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
      let decompressed: Buffer;
      try {
        decompressed = await gunzipAsync(buf, { maxOutputLength: MAX_DECOMPRESSED_BYTES });
      } catch {
        return NextResponse.json({ error: "Invalid gzip payload" }, { status: 400 });
      }
      
      const lines = decompressed.toString("utf-8").split("\n").filter(Boolean);
      try {
        events = lines.map((line) => JSON.parse(line));
      } catch {
        return NextResponse.json({ error: "Invalid NDJSON payload" }, { status: 400 });
      }
    } else if (Array.isArray(body.events)) {
      events = body.events;
    } else {
      return NextResponse.json({ error: "No events provided" }, { status: 400 });
    }

    if (events.length === 0) {
      return NextResponse.json({ status: "ok", ingested: 0 }, { status: 202 });
    }
    if (events.length > MAX_EVENTS_PER_CHUNK) {
      return NextResponse.json({ error: "Too many events in chunk" }, { status: 413 });
    }

    const duration = Math.min(
      Math.max(Math.floor(Number(body.duration) || 0), 0),
      MAX_DURATION
    );

    // ── Guard rails before writing ────────────────────────────────────────────
    const existing = await prisma.sessionRecording.findUnique({
      where: { id: sessionId },
      select: { workspaceId: true, chunkCount: true, duration: true },
    });
    if (existing) {
      // A session id is globally unique; never let one workspace append to another's.
      if (existing.workspaceId !== workspaceId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.chunkCount >= MAX_SESSION_CHUNKS) {
        return NextResponse.json({ error: "Recording too large" }, { status: 413 });
      }
    } else {
      const planConfig = getEffectivePlan(plan as any);
      if (!planConfig.features.includes("session_recording")) {
        return NextResponse.json({ error: "Session Replay is not enabled on your plan" }, { status: 403 });
      }

      if (isCloudHosted()) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyCount = await prisma.sessionRecording.count({
          where: {
            workspaceId,
            createdAt: { gte: startOfMonth },
          },
        });

        if (monthlyCount >= planConfig.maxRecordingsPerMonth) {
          return NextResponse.json({ error: "Monthly session recording quota exceeded" }, { status: 429 });
        }
      }
    }

    // ── Store the flush as one immutable gzipped-NDJSON chunk ──────────────────
    let gz: Buffer;
    if (body.eventsGzip) {
      gz = Buffer.from(body.eventsGzip, "base64");
    } else {
      const ndjson = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
      gz = await gzipAsync(ndjson);
    }
    const storageKey = await getRecordingStore().putChunk(workspaceId, sessionId, gz);

    // ── Upsert metadata (atomic; tolerates the flush/pagehide write race) ──────
    const newDuration = existing ? Math.max(existing.duration, duration) : duration;

    await prisma.sessionRecording.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        workspaceId,
        distinctId: body.distinctId ?? "",
        browser: body.browser,
        os: body.os,
        pagePath: body.pagePath,
        duration: newDuration,
        storageKey,
        chunkCount: 1,
      },
      update: {
        duration: newDuration,
        chunkCount: { increment: 1 },
        // Enrich metadata if a later chunk carries it.
        ...(body.distinctId ? { distinctId: body.distinctId } : {}),
        ...(body.browser ? { browser: body.browser } : {}),
        ...(body.os ? { os: body.os } : {}),
      },
    });

    return NextResponse.json({ status: "ok", ingested: events.length }, { status: 202 });
  } catch (err) {
    console.error("[record]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
