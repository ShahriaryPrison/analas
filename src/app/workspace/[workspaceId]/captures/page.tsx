import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";

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

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wide text-white/60">Recent captures</div>
          <div className="mt-2 text-3xl font-bold">{captures.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
          <div className="text-xs uppercase tracking-wide text-white/60">Top events</div>
          <div className="mt-4 space-y-3">
            {eventCounts.length ? (
              eventCounts.map((item) => (
                <div key={item.event} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.event}</span>
                    <span className="text-white/70">{Number(item.count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{ width: `${(Number(item.count) / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/60">No captures yet.</div>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
        <h2 className="text-lg font-semibold">Capture calls</h2>
        <p className="mt-1 text-sm text-white/70">All recent events received for this workspace.</p>
        <div className="mt-5 space-y-3">
          {captures.length ? (
            captures.map((capture, i) => (
              <div key={`${capture.ts}-${i}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{capture.event}</div>
                  <div className="text-xs text-white/60">{new Date(capture.ts).toLocaleString()}</div>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950/60 p-3 text-xs text-white/80">
                  {capture.properties}
                </pre>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/70">
              No capture calls yet. Send a test event with the API key to see it here.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
