import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import { ZapIcon, ActivityIcon, BarChart2Icon } from "@/components/icons";

import { APP_TIMEZONE } from "@/lib/insight-query";

type CaptureRow = { event: string; user_id: string; session_id: string; properties: string; ts: string };
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
        `SELECT event, user_id, session_id, properties, formatDateTime(ts, '%Y-%m-%d %H:%M:%S', {timezone:String}) AS ts
         FROM events
         WHERE tenant_id = {tenantId:String}
         ORDER BY ts DESC LIMIT 50`,
        { tenantId: workspace.tenantId, timezone: APP_TIMEZONE }
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
            captures.map((capture, i) => {
              const hasIdentity = !!(capture.user_id || capture.session_id);
              return (
                <div
                  key={`${capture.ts}-${i}`}
                  className="rounded-xl border border-white/10 bg-white/3 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-0.5" />
                      <span className="font-semibold text-white truncate">{capture.event}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 mt-0.5">
                      {!hasIdentity && (
                        <a
                          href={`/workspace/${workspaceId}/settings`}
                          title="This event is missing a user or session ID. Click to learn how to add it."
                          className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-300/80 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded transition hover:bg-blue-500/20 hover:text-blue-200"
                        >
                          ⚠️ Missing Identity
                        </a>
                      )}
                      <div className="text-xs text-white/40">{capture.ts}</div>
                    </div>
                  </div>
                  <pre className="mt-2 rounded-lg bg-slate-950/60 border border-white/6 p-3 text-xs font-mono text-white/60 overflow-x-auto">
                    {capture.properties}
                  </pre>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center sm:p-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 mb-6 shadow-inner border border-white/10">
                <ZapIcon className="w-6 h-6 text-white/50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Waiting for events</h3>
              <p className="text-sm text-white/50 max-w-sm mx-auto mb-8">
                Your analytics stream is empty. Send your first event to see it appear here instantly.
              </p>
              
              <div className="text-left bg-slate-950/60 border border-white/10 rounded-xl p-5 max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-sm font-semibold text-white">Quick Start</h4>
                  <a href={`/workspace/${workspaceId}/settings`} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    Get API Key →
                  </a>
                </div>
                
                <div className="space-y-3">
                  <p className="text-xs text-white/60">
                    Send a POST request to <code className="text-emerald-300 bg-emerald-500/10 px-1 rounded">/api/capture</code> with your payload:
                  </p>
                  <pre className="text-[11px] font-mono text-white/70 bg-black/40 p-3 rounded-lg border border-white/5 overflow-x-auto">
{`[
  {
    "event": "page_loaded",
    "userId": "user_123",      // Optional: unlocks Unique User metrics
    "sessionId": "sess_abc",   // Optional: unlocks Funnel tracking
    "properties": {            // Custom data for Breakdowns
      "path": "/home"
    }
  }
]`}
                  </pre>
                  <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mt-2">
                     <span className="text-[10px] uppercase font-bold text-blue-400 mt-0.5 shrink-0">Tip</span>
                     <p className="text-xs text-blue-200/70 leading-relaxed">
                       Always include <strong>userId</strong> or <strong>sessionId</strong> if available. Analas automatically indexes these root fields for lightning-fast advanced aggregations.
                     </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
