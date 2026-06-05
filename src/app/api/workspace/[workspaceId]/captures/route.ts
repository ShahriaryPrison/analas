import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import { APP_TIMEZONE } from "@/lib/insight-query";

type CaptureRow = {
  event: string;
  user_id: string;
  session_id: string;
  properties: string;
  ts: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const { workspace } = await getAuthorizedWorkspace(workspaceId);

    const url = new URL(req.url);
    const event = url.searchParams.get("event")?.trim() ?? "";
    const userId = url.searchParams.get("userId")?.trim() ?? "";
    const dateFrom = url.searchParams.get("dateFrom")?.trim() ?? "";
    const dateTo = url.searchParams.get("dateTo")?.trim() ?? "";
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

    const conditions: string[] = ["tenant_id = {tenantId:String}"];
    const qParams: Record<string, unknown> = {
      tenantId: workspace.tenantId,
      timezone: APP_TIMEZONE,
    };

    if (event) {
      conditions.push("event ILIKE {eventPattern:String}");
      qParams.eventPattern = `%${event}%`;
    }
    if (userId) {
      conditions.push("user_id = {userId:String}");
      qParams.userId = userId;
    }
    if (dateFrom) {
      conditions.push("ts >= {dateFrom:String}");
      qParams.dateFrom = dateFrom;
    }
    if (dateTo) {
      conditions.push("ts <= {dateTo:String}");
      qParams.dateTo = dateTo;
    }

    const whereClause = conditions.join(" AND ");

    const [rows, countRows] = await Promise.all([
      queryJson<CaptureRow>(
        `SELECT event, user_id, session_id, properties,
                formatDateTime(ts, '%Y-%m-%d %H:%i:%S', {timezone:String}) AS ts
         FROM events
         WHERE ${whereClause}
         ORDER BY ts DESC
         LIMIT ${limit} OFFSET ${offset}`,
        qParams
      ),
      queryJson<{ total: string }>(
        `SELECT count() AS total FROM events WHERE ${whereClause}`,
        qParams
      ),
    ]);

    return NextResponse.json({ rows, total: Number(countRows[0]?.total ?? 0) });
  } catch (e) {
    console.error("Captures API error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
