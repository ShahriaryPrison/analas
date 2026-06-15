import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { prisma } from "@/lib/prisma";
import RecordingsClient from "./recordings-client";

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export default async function RecordingsPage({ params }: Props) {
  const { workspaceId } = await params;
  const { workspace } = await getAuthorizedWorkspace(workspaceId);

  // Get initial recording count
  const initialCount = await prisma.sessionRecording.count({
    where: { workspaceId },
  });

  // Check if there are any API keys generated for the workspace
  const activeKeyName = workspace.apiKeys[0]?.name ?? null;

  return (
    <div className="space-y-8 min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Session Replays</h1>
          <p className="text-sm text-white/50 mt-1">
            Watch real-time user sessions to identify friction points and debug issues.
          </p>
        </div>
      </div>

      <RecordingsClient
        workspaceId={workspaceId}
        initialCount={initialCount}
        activeKeyName={activeKeyName}
        publicToken={workspace.publicToken}
      />
    </div>
  );
}
