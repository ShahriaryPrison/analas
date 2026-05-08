import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clickhouse } from "@/lib/clickhouse";
import crypto from "node:crypto";

type CaptureEvent = {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: string | number;
};

const RATE_LIMIT = 600;
const rateMap = new Map<string, { ts: number; count: number }>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const apiCache = new Map<string, { tenantId: string; expiresAt: number }>();

type InsertEvent = {
  tenant_id: string;
  event: string;
  properties: string;
  ts: string;
};

const MAX_BUFFER_SIZE = 100;
const FLUSH_INTERVAL_MS = 5000;
let eventsBuffer: InsertEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

async function flushEvents() {
  if (eventsBuffer.length === 0) return;
  const batch = [...eventsBuffer];
  eventsBuffer = []; // clear buffer
  
  try {
    await clickhouse.insert({
      table: "events",
      values: batch,
      format: "JSONEachRow",
    });
  } catch (e) {
    console.error("ClickHouse batch insert failed:", e);
  }
}

function queueEvent(event: InsertEvent) {
  eventsBuffer.push(event);
  
  if (eventsBuffer.length >= MAX_BUFFER_SIZE) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    flushEvents(); // trigger flush immediately
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushEvents();
    }, FLUSH_INTERVAL_MS);
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer "))
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    const key = auth.replace(/^Bearer\s+/i, "").trim();
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");

    let tenantId = "";
    const cached = apiCache.get(keyHash);
    if (cached && cached.expiresAt > Date.now()) {
      tenantId = cached.tenantId;
    } else {
      const api = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { workspace: { select: { tenantId: true } } },
      });
      if (!api) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      tenantId = api.workspace.tenantId;
      apiCache.set(keyHash, { tenantId, expiresAt: Date.now() + CACHE_TTL });
    }

    // In-memory rate limit (per key, 1-minute window)
    const now = Date.now();
    const entry = rateMap.get(keyHash);
    if (!entry || now - entry.ts > 60_000) {
      rateMap.set(keyHash, { ts: now, count: 1 });
    } else {
      entry.count++;
      if (entry.count > RATE_LIMIT)
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      rateMap.set(keyHash, entry);
    }

    const body = (await req.json()) as CaptureEvent;
    if (!body || typeof body.event !== "string" || body.event.length === 0)
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    queueEvent({
      tenant_id: tenantId,
      event: body.event,
      properties: JSON.stringify(body.properties ?? {}),
      ts: timestamp.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""),
    });

    return NextResponse.json({ status: "accepted" }, { status: 202 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
