import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import SettingsClient from "./settings-client";

export default async function SettingsPage({
  params,
}: Readonly<{ params: Promise<{ workspaceId: string }> }>) {
  const { workspaceId } = await params;
  const { workspace, membership } = await getAuthorizedWorkspace(workspaceId);

  const keys = workspace.apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
        <h2 className="text-lg font-semibold">Workspace info</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-white/50">Name</dt>
            <dd className="mt-1 font-medium">{workspace.name}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-white/50">Plan</dt>
            <dd className="mt-1 font-medium">{workspace.plan}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-white/50">Your role</dt>
            <dd className="mt-1 font-medium">{membership?.role ?? "—"}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-white/50">Tenant ID</dt>
            <dd className="mt-1 font-mono text-xs text-white/70 break-all">{workspace.tenantId}</dd>
          </div>
        </dl>
      </div>

      <SettingsClient workspaceId={workspaceId} initialKeys={keys} />
    </section>
  );
}
