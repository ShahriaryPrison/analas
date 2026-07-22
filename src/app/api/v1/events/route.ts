import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { getTopEvents } from "@/lib/clickhouse";

export async function GET(req: Request) {
  const auth = await resolveApiKey(req, { scope: "events:read" });
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 100);

  const events = await getTopEvents(auth.tenantId, limit);
  return NextResponse.json({ events });
}
