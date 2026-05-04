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

async function ensureEventsTable() {
  try {
    const { stream } = await clickhouse.exec({
      query: `
        CREATE TABLE IF NOT EXISTS events (
          tenant_id  String,
          event      String,
          properties String,
          ts         DateTime64(3)
        ) ENGINE = MergeTree() ORDER BY (tenant_id, ts)
      `,
    });
    stream.resume(); // drain so the socket closes cleanly
  } catch {
    // already exists or ClickHouse unreachable — non-fatal
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer "))
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    const key = auth.replace(/^Bearer\s+/i, "").trim();
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");

    // Include workspace so we have the correct tenantId for ClickHouse
    const api = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { workspace: { select: { tenantId: true } } },
    });
    if (!api) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

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

    await ensureEventsTable();

    // Use insert API — zero string interpolation, no SQL injection
    try {
      await clickhouse.insert({
        table: "events",
        values: [
          {
            tenant_id: api.workspace.tenantId,
            event: body.event,
            properties: JSON.stringify(body.properties ?? {}),
            ts: timestamp.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""),
          },
        ],
        format: "JSONEachRow",
      });
    } catch (e) {
      console.error("ClickHouse insert failed:", e);
      // accept the request anyway so we never block producers
    }

    return NextResponse.json({ status: "accepted" }, { status: 202 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
