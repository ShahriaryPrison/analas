import Link from "next/link";
import { getAuthorizedWorkspace } from "@/lib/workspace-access";

export default async function WorkspaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}>) {
  const { workspaceId } = await params;
  const { workspace, membership } = await getAuthorizedWorkspace(workspaceId);

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-950 via-slate-900 to-amber-950 text-white p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{workspace.name}</h1>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold">{workspace.plan} PLAN</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                  {membership?.role ?? "OWNER"}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/70">Tenant: {workspace.tenantId}</p>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm">
              <Link href={`/workspace/${workspace.id}/captures`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 transition">
                Captures
              </Link>
              <Link href={`/workspace/${workspace.id}/insights`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 transition">
                Insights
              </Link>
              <Link href={`/workspace/${workspace.id}/settings`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 transition">
                Settings
              </Link>
            </nav>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
