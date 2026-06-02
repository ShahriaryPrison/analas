import { requireAdminAccess } from "@/lib/workspace-access";
import SettingsClient from "./settings-client";
import { SparklesIcon, UsersIcon, KeyIcon } from "@/components/icons";

export default async function SettingsPage({
  params,
}: Readonly<{ params: Promise<{ workspaceId: string }> }>) {
  const { workspaceId } = await params;
  const { workspace, membership } = await requireAdminAccess(workspaceId);

  const keys = workspace.apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    createdAt: k.createdAt.toISOString(),
  }));

  const members = workspace.members.map((m) => ({
    id: m.userId,
    name: m.user.name ?? null,
    email: m.user.email,
    role: m.role,
  }));

  const pendingInvites = workspace.invites
    .filter((i) => i.email !== null)
    .map((i) => ({
      id: i.id,
      email: i.email!,
      role: i.role,
      createdAt: i.createdAt.toISOString(),
    }));

  // Get current public link token if enabled
  const publicLinkInvite = workspace.invites.find((i) => i.email === null);

  return (
    <section className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/50 mt-1">Manage your workspace configuration and team.</p>
      </div>

      {/* Workspace info card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Workspace info</h2>
        <dl className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-1">
              Name
            </dt>
            <dd className="text-sm font-medium text-white">{workspace.name}</dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-1">
              <SparklesIcon className="w-3 h-3" />
              Plan
            </dt>
            <dd className="text-sm font-medium text-white">{workspace.plan}</dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-1">
              <UsersIcon className="w-3 h-3" />
              Your role
            </dt>
            <dd className="text-sm font-medium text-white">{membership?.role ?? "—"}</dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-1">
              <KeyIcon className="w-3 h-3" />
              Tenant ID
            </dt>
            <dd className="mt-0.5 font-mono text-xs text-white/70 break-all">{workspace.tenantId}</dd>
          </div>
        </dl>
      </div>

      <SettingsClient
        workspaceId={workspaceId}
        initialKeys={keys}
        members={members}
        pendingInvites={pendingInvites}
        myRole={membership?.role ?? "OWNER"}
        inviteLinkEnabled={workspace.inviteLinkEnabled}
        inviteLinkToken={publicLinkInvite?.token ?? null}
        inviteLinkExpiry={publicLinkInvite?.expiresAt?.toISOString() ?? null}
        appUrl={process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ""}
        plan={workspace.plan}
        currentMonthEvents={workspace.currentMonthEvents}
      />
    </section>
  );
}
