import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import { ZapIcon, ActivityIcon, BarChart2Icon } from "@/components/icons";
import { APP_TIMEZONE } from "@/lib/insight-query";
import CapturesClient from "./captures-client";

type EventCountRow = { event: string; count: string | number };
type TotalRow = { total: string | number };

export default async function CapturesPage({
  params,
}: Readonly<{ params: Promise<{ workspaceId: string }> }>) {
  const { workspaceId } = await params;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  let eventCounts: EventCountRow[] = [];
  let totalEvents = 0;

  try {
    const [counts, totals] = await Promise.all([
      queryJson<EventCountRow>(
        `SELECT event, count() AS count
         FROM events
         WHERE tenant_id = {tenantId:String}
         GROUP BY event ORDER BY count DESC LIMIT 8`,
        { tenantId: workspace.tenantId }
      ),
      queryJson<TotalRow>(
        `SELECT count() AS total FROM events WHERE tenant_id = {tenantId:String}`,
        { tenantId: workspace.tenantId }
      ),
    ]);
    eventCounts = counts;
    totalEvents = Number(totals[0]?.total ?? 0);
  } catch (e) {
    console.error("Failed to load ClickHouse captures", e);
  }

  const topEvents = eventCounts.map((r) => r.event);
  const maxCount = Math.max(...eventCounts.map((r) => Number(r.count)), 0) || 1;

  return (
    <section className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Captures</h1>
        <p className="text-sm text-white/50 mt-1">Search and filter your real-time event stream.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15">
              <ZapIcon className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{totalEvents.toLocaleString()}</div>
          <div className="text-xs uppercase tracking-wide text-white/40 mt-1">Total events</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/15">
              <ActivityIcon className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{eventCounts.length}</div>
          <div className="text-xs uppercase tracking-wide text-white/40 mt-1">Unique event types</div>
        </div>

        <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 sm:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/15">
              <BarChart2Icon className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{topEvents.length}</div>
          <div className="text-xs uppercase tracking-wide text-white/40 mt-1">Tracked event names</div>
        </div>
      </div>

      {/* Top events chart */}
      {eventCounts.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-4">Top events</div>
          <div className="space-y-2">
            {eventCounts.map((item) => (
              <div key={item.event} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{item.event}</span>
                  <span className="text-white/50 tabular-nums">{Number(item.count).toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-emerald-400"
                    style={{ width: `${(Number(item.count) / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive feed */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">Event feed</h2>
        <CapturesClient workspaceId={workspaceId} topEvents={topEvents} />
      </section>
    </section>
  );
}
