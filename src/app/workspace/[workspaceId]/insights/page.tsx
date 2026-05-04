import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import InsightsClient from "./insights-client";

type EventCountRow = { event: string; count: string | number };
type DailyRow = { day: string; count: string | number };

export default async function InsightsPage({
  params,
}: Readonly<{ params: Promise<{ workspaceId: string }> }>) {
  const { workspaceId } = await params;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  const insights = workspace.dashboards.flatMap((d) => d.insights);

  const [topEvents, insightSeries] = await Promise.all([
    queryJson<EventCountRow>(
      `SELECT event, count() AS count
       FROM events
       WHERE tenant_id = {tenantId:String}
       GROUP BY event ORDER BY count DESC LIMIT 8`,
      { tenantId: workspace.tenantId }
    ).catch(() => [] as EventCountRow[]),

    Promise.all(
      insights.map(async (insight) => {
        const eventName = String((insight.queryConfig as any)?.eventName ?? "");
        const rows = await queryJson<DailyRow>(
          `SELECT formatDateTime(ts, '%Y-%m-%d') AS day, count() AS count
           FROM events
           WHERE tenant_id = {tenantId:String}
             AND event = {event:String}
             AND ts >= now() - INTERVAL 7 DAY
           GROUP BY day ORDER BY day ASC`,
          { tenantId: workspace.tenantId, event: eventName }
        ).catch(() => [] as DailyRow[]);

        const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
        return { ...insight, eventName, rows, total };
      })
    ),
  ]);

  const maxTopCount = Math.max(...topEvents.map((r) => Number(r.count)), 0) || 1;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wide text-white/60">Insights saved</div>
          <div className="mt-2 text-3xl font-bold">{insights.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
          <div className="text-xs uppercase tracking-wide text-white/60">Top capture names</div>
          <div className="mt-4 space-y-3">
            {topEvents.length ? (
              topEvents.map((item) => (
                <div key={item.event} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.event}</span>
                    <span className="text-white/70">{Number(item.count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-cyan-400"
                      style={{ width: `${(Number(item.count) / maxTopCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/60">No capture data yet.</div>
            )}
          </div>
        </div>
      </div>

      <InsightsClient workspaceId={workspace.id} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Saved insights</h2>
          <p className="text-sm text-white/70">Each insight tracks event count with a 7-day chart.</p>
        </div>
        {insightSeries.length ? (
          insightSeries.map((insight) => {
            const maxSeries = Math.max(...insight.rows.map((r) => Number(r.count)), 0) || 1;
            return (
              <article key={insight.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">{insight.name}</h3>
                    <p className="text-sm text-white/70">Event: {insight.eventName || "—"}</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                    {insight.total} count{insight.total === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Last 7 days</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {insight.rows.length ? (
                      insight.rows.map((row) => (
                        <div key={row.day} className="flex flex-col items-center gap-2">
                          <div className="flex h-32 w-full items-end rounded-lg border border-white/10 bg-white/5 p-2">
                            <div
                              className="w-full rounded-md bg-emerald-400"
                              style={{ height: `${(Number(row.count) / maxSeries) * 100}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-white/60">{row.day.slice(5)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-7 rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/60">
                        No data for this insight yet.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/70">
            No insights yet. Create one above.
          </div>
        )}
      </section>
    </section>
  );
}
