import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import { prisma } from "@/lib/prisma";
import InsightsHeader from "./insights-header";
import InsightCard from "./insight-card";
import CopyEventName from "./copy-event-name";
import { BarChart2Icon } from "@/components/icons";

type EventCountRow = { event: string; count: string | number };

export default async function InsightsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ dashboardId?: string }>;
}>) {
  const { workspaceId } = await params;
  const { dashboardId } = await searchParams;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  // Self-heal: ensure we have at least one dashboard
  let dashboards = workspace.dashboards || [];
  if (dashboards.length === 0) {
    const defaultDb = await prisma.dashboard.create({
      data: {
        name: "Main dashboard",
        workspaceId: workspace.id,
      },
      include: { insights: true },
    });
    dashboards = [defaultDb];
  }

  // Find active dashboard or fallback to the first one
  const activeDashboard = dashboards.find((d) => d.id === dashboardId) || dashboards[0];
  const insights = (activeDashboard?.insights || []).sort((a, b) => a.position - b.position);

  const archivedEvents = await prisma.eventSetting.findMany({
    where: { workspaceId, isArchived: true },
    select: { eventName: true },
  });
  const archivedNames = archivedEvents.map((ae) => ae.eventName);

  const allTopEvents = await queryJson<EventCountRow>(
    `SELECT event, count() AS count
     FROM events
     WHERE tenant_id = {tenantId:String}
     GROUP BY event ORDER BY count DESC LIMIT 100`,
    { tenantId: workspace.tenantId }
  ).catch(() => [] as EventCountRow[]);

  const topEvents = allTopEvents
    .filter((r) => !archivedNames.includes(r.event))
    .slice(0, 8);

  const maxTopCount = Math.max(...topEvents.map((r) => Number(r.count)), 0) || 1;

  const insightsMeta = insights.map((ins) => ({
    id: ins.id,
    name: ins.name,
    type: ins.type,
    queryConfig: (ins.queryConfig as Record<string, unknown>) ?? {},
  }));

  return (
    <div className="space-y-12">
      <InsightsHeader
        workspaceId={workspace.id}
        dashboards={dashboards}
        activeDashboard={activeDashboard}
        plan={workspace.plan}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/30">Analytics Canvas</h2>
          <div className="h-px flex-1 bg-white/5 mx-6" />
        </div>

        {insightsMeta.length ? (
          <div className="bento-grid">
            {insightsMeta.map((ins) => {
              // Determine card size based on type for bento effect
              let sizeClass = "bento-item-md";
              if (ins.type === "count") sizeClass = "bento-item-sm";
              if (ins.type === "funnel") sizeClass = "bento-item-lg";
              if (ins.type === "multi_trend" || ins.type === "retention") sizeClass = "bento-item-full";

              return (
                <div key={ins.id} className={`${sizeClass} transition-all duration-500 hover:-translate-y-1`}>
                  <InsightCard workspaceId={workspace.id} insight={ins} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-20 text-center space-y-4 border-dashed">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
               <BarChart2Icon className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white">Your dashboard is empty</h3>
            <p className="text-white/40 text-sm max-w-xs mx-auto">
              Start by creating an insight to track your key product metrics in real-time.
            </p>
          </div>
        )}
      </div>

      {/* Discover events panel */}
      {topEvents.length > 0 && (
        <div className="space-y-6 pt-12 border-t border-white/5">
           <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/30">Data Discovery</h2>
            <div className="h-px flex-1 bg-white/5 mx-6" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topEvents.map((item) => (
              <div key={item.event} className="glass-panel p-5 rounded-2xl space-y-4 group">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white/70 group-hover:text-emerald-400 transition truncate">{item.event}</span>
                  <CopyEventName name={item.event} />
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="text-2xl font-black text-white">{Number(item.count).toLocaleString()}</div>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-emerald-400/50 transition-all duration-1000"
                      style={{ width: `${(Number(item.count) / maxTopCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
