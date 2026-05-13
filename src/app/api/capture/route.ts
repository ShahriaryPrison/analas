import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clickhouse, insertEvents } from "@/lib/clickhouse";
import crypto from "node:crypto";

type CaptureEvent = {
  event: string;
  userId?: string;
  anonymousId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  timestamp?: string | number;
  [key: string]: any;
};

const RATE_LIMIT = 600;
const rateMap = new Map<string, { ts: number; count: number }>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const apiCache = new Map<string, { tenantId: string; expiresAt: number }>();

type InsertEvent = {
  tenant_id: string;
  event: string;
  user_id: string;
  session_id: string;
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
    await insertEvents("events", batch);
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

    const rawBody = await req.json();
    const items = Array.isArray(rawBody) ? rawBody : [rawBody];
    
    let validCount = 0;

    for (const item of items) {
      if (!item || typeof item !== "object" || typeof item.event !== "string" || item.event.length === 0) {
        continue;
      }

      const timestamp = item.timestamp ? new Date(item.timestamp) : new Date();
      
      const userId = String(item.userId || item.anonymousId || item.properties?.userId || item.properties?.anonymousId || "");
      const sessionId = String(item.sessionId || item.properties?.sessionId || "");

      const properties = { ...item };
      delete properties.event;
      delete properties.timestamp;
      delete properties.userId;
      delete properties.anonymousId;
      delete properties.sessionId;

      queueEvent({
        tenant_id: tenantId,
        event: item.event,
        user_id: userId,
        session_id: sessionId,
        properties: JSON.stringify(properties),
        ts: timestamp.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""),
      });
      validCount++;
    }

    if (validCount === 0 && items.length > 0) {
      return NextResponse.json({ error: "Invalid payload: no valid events found" }, { status: 400 });
    }

    return NextResponse.json({ status: "accepted", ingested: validCount }, { status: 202 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
