import { requireAdminAccess } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import { prisma } from "@/lib/prisma";
import EventsClient from "./events-client";

type ClickHouseEventRow = { event: string };

export default async function WorkspaceEventsPage({
  params,
}: Readonly<{ params: Promise<{ workspaceId: string }> }>) {
  const { workspaceId } = await params;
  const { workspace } = await requireAdminAccess(workspaceId);

  // 1. Fetch unique event names seen in ClickHouse
  const capturedEvents = await queryJson<ClickHouseEventRow>(
    `SELECT event
     FROM events
     WHERE tenant_id = {tenantId:String}
     GROUP BY event`,
    { tenantId: workspace.tenantId }
  ).catch(() => [] as ClickHouseEventRow[]);

  // 2. Fetch EventSettings from Postgres
  const settings = await prisma.eventSetting.findMany({
    where: { workspaceId },
  });

  const eventsData = capturedEvents.map((row) => {
    const s = settings.find((set) => set.eventName === row.event);
    return {
      name: row.event,
      isArchived: s?.isArchived ?? false,
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white">Event Schema</h1>
        <p className="text-sm text-white/50 mt-1">
          Archive typos, test events, or deprecated names to clean up your dashboard UI.
        </p>
      </div>

      <EventsClient workspaceId={workspaceId} initialEvents={eventsData} />
    </div>
  );
}
