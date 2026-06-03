import { getTopEvents } from "@/lib/clickhouse";
import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import InsightBuilder from "./builder-client";

export default async function NewInsightPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ dashboardId?: string }>;
}) {
  const { workspaceId } = await params;
  const { dashboardId } = await searchParams;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  // Fetch top events for auto-suggest (increased limit for better live search)
  const topEvents = await getTopEvents(workspace.tenantId, 100);

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
      <InsightBuilder
        workspaceId={workspaceId}
        topEvents={topEvents}
        plan={workspace.plan}
        dashboardId={dashboardId || null}
      />
    </div>
  );
}
