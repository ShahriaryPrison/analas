import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import { ZapIcon, ActivityIcon, BarChart2Icon } from "@/components/icons";

type CaptureRow = { event: string; properties: string; ts: string };
type EventCountRow = { event: string; count: string | number };

export default async function CapturesPage({
  params,
}: Readonly<{ params: Promise<{ workspaceId: string }> }>) {
  const { workspaceId } = await params;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  let captures: CaptureRow[] = [];
  let eventCounts: EventCountRow[] = [];

  try {
    [captures, eventCounts] = await Promise.all([
      queryJson<CaptureRow>(
        `SELECT event, properties, toString(ts) AS ts
         FROM events
         WHERE tenant_id = {tenantId:String}
         ORDER BY ts DESC LIMIT 50`,
        { tenantId: workspace.tenantId }
      ),
      queryJson<EventCountRow>(
        `SELECT event, count() AS count
         FROM events
         WHERE tenant_id = {tenantId:String}
         GROUP BY event ORDER BY count DESC LIMIT 8`,
        { tenantId: workspace.tenantId }
      ),
    ]);
  } catch (e) {
    console.error("Failed to load ClickHouse captures", e);
  }

  const maxCount = Math.max(...eventCounts.map((r) => Number(r.count)), 0) || 1;
  const totalEvents = eventCounts.reduce((sum, r) => sum + Number(r.count), 0);

  return (
    <section className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Captures</h1>
        <p className="text-sm text-white/50 mt-1">Real-time event stream for this workspace.</p>
      </div>

      {/* Stats row — 3 equal cards */}
      <div className="grid gap-4 md:grid-cols-3">
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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/15">
              <BarChart2Icon className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{captures.length}</div>
          <div className="text-xs uppercase tracking-wide text-white/40 mt-1">Recent (last 50)</div>
        </div>
      </div>

      {/* Top events */}
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

      {/* Capture feed */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">Capture feed</h2>
        <div className="space-y-2">
          {captures.length ? (
            captures.map((capture, i) => (
              <div
                key={`${capture.ts}-${i}`}
                className="rounded-xl border border-white/10 bg-white/3 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">{capture.event}</span>
                  </div>
                  <div className="text-xs text-white/40">{new Date(capture.ts).toLocaleString()}</div>
                </div>
                <pre className="mt-2 rounded-lg bg-slate-950/60 border border-white/6 p-3 text-xs font-mono text-white/60 overflow-x-auto">
                  {capture.properties}
                </pre>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/50">
              No capture calls yet. Send a test event with the API key to see it here.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
