import { getTopEvents } from "@/lib/clickhouse";
import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { prisma } from "@/lib/prisma";
import InsightBuilder from "../new/builder-client";
import { notFound } from "next/navigation";

export default async function EditInsightPage({
  params,
}: {
  params: Promise<{ workspaceId: string; insightId: string }>;
}) {
  const { workspaceId, insightId } = await params;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  // Fetch the insight and verify it belongs to this workspace
  const insight = await prisma.insight.findFirst({
    where: {
      id: insightId,
      dashboard: {
        workspaceId: workspace.id,
      },
    },
  });

  if (!insight) {
    notFound();
  }

  // Fetch archived event settings
  const archivedEvents = await prisma.eventSetting.findMany({
    where: { workspaceId, isArchived: true },
    select: { eventName: true },
  });
  const archivedNames = archivedEvents.map((ae) => ae.eventName);

  // Fetch top events for auto-suggest
  const allTopEvents = await getTopEvents(workspace.tenantId, 100);
  const topEvents = allTopEvents.filter((e) => !archivedNames.includes(e));

  // Safe cast of queryConfig for the client boundary
  const clientInsight = {
    id: insight.id,
    name: insight.name,
    type: insight.type,
    queryConfig: insight.queryConfig && typeof insight.queryConfig === "object"
      ? (insight.queryConfig as Record<string, unknown>)
      : {},
    dashboardId: insight.dashboardId,
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
      <InsightBuilder
        workspaceId={workspaceId}
        topEvents={topEvents}
        plan={workspace.plan}
        dashboardId={insight.dashboardId}
        initialInsight={clientInsight}
      />
    </div>
  );
}
