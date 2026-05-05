import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { queryJson } from "@/lib/clickhouse";
import { NextResponse } from "next/server";

type DailyRow = { day: string; count: string | number };

function fillDays(rows: DailyRow[]): { day: string; count: number }[] {
  const map = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ day: key, count: map.get(key) ?? 0 });
  }
  return result;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; insightId: string }> }
) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, insightId } = await context.params;

  const insight = await prisma.insight.findFirst({
    where: {
      id: insightId,
      dashboard: {
        workspace: {
          id: workspaceId,
          members: { some: { user: { email: session.user.email } } },
        },
      },
    },
    include: { dashboard: { include: { workspace: true } } },
  });

  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenantId = insight.dashboard.workspace.tenantId;
  const eventName = String((insight.queryConfig as Record<string, unknown>)?.eventName ?? "");

  if (insight.type === "count") {
    const rows = await queryJson<{ total: string | number }>(
      `SELECT count() AS total FROM events
       WHERE tenant_id = {tenantId:String} AND event = {event:String}`,
      { tenantId, event: eventName }
    ).catch(() => []);
    const total = Number(rows[0]?.total ?? 0);
    return NextResponse.json({ total, rows: [] });
  }

  // trend
  const raw = await queryJson<DailyRow>(
    `SELECT formatDateTime(ts, '%Y-%m-%d') AS day, count() AS count
     FROM events
     WHERE tenant_id = {tenantId:String}
       AND event = {event:String}
       AND ts >= now() - INTERVAL 7 DAY
     GROUP BY day ORDER BY day ASC`,
    { tenantId, event: eventName }
  ).catch(() => [] as DailyRow[]);

  const filledRows = fillDays(raw);
  const total = filledRows.reduce((s, r) => s + r.count, 0);
  return NextResponse.json({ total, rows: filledRows });
}
