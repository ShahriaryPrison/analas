import { getTopEvents } from "@/lib/clickhouse";
import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import InsightBuilder from "./builder-client";

export default async function NewInsightPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await getAuthorizedWorkspace(workspaceId);

  // Fetch top events for auto-suggest
  const topEvents = await getTopEvents(workspaceId, 10);

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
      <InsightBuilder workspaceId={workspaceId} topEvents={topEvents} />
    </div>
  );
}
