import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import InsightsHeader from "./insights-header";
import InsightCard from "./insight-card";
import CopyEventName from "./copy-event-name";

type EventCountRow = { event: string; count: string | number };

export default async function InsightsPage({
  params,
}: Readonly<{ params: Promise<{ workspaceId: string }> }>) {
  const { workspaceId } = await params;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  const insights = workspace.dashboards.flatMap((d) => d.insights);

  const topEvents = await queryJson<EventCountRow>(
    `SELECT event, count() AS count
     FROM events
     WHERE tenant_id = {tenantId:String}
     GROUP BY event ORDER BY count DESC LIMIT 8`,
    { tenantId: workspace.tenantId }
  ).catch(() => [] as EventCountRow[]);

  const topEventNames = topEvents.map((r) => r.event);
  const maxTopCount = Math.max(...topEvents.map((r) => Number(r.count)), 0) || 1;

  const insightsMeta = insights.map((ins) => ({
    id: ins.id,
    name: ins.name,
    type: ins.type,
    eventName: String((ins.queryConfig as Record<string, unknown>)?.eventName ?? ""),
  }));

  return (
    <section className="space-y-8">
      <InsightsHeader workspaceId={workspace.id} topEvents={topEventNames} />

      {/* Top captures panel */}
      {topEvents.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wide text-white/50 mb-4">
            Top capture names
          </div>
          <div className="space-y-3">
            {topEvents.map((item) => (
              <div key={item.event} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.event}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">{Number(item.count)}</span>
                    <CopyEventName name={item.event} />
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-cyan-400"
                    style={{ width: `${(Number(item.count) / maxTopCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight cards */}
      {insightsMeta.length ? (
        <div className="space-y-4">
          {insightsMeta.map((ins) => (
            <InsightCard key={ins.id} workspaceId={workspace.id} insight={ins} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <p className="text-white/40 text-sm">No insights yet.</p>
          <p className="text-white/30 text-xs mt-1">Click &ldquo;New insight&rdquo; above to create one.</p>
        </div>
      )}
    </section>
  );
}
