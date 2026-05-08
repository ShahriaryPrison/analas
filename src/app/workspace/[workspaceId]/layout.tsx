import Link from "next/link";
import PineappleIcon from "@/components/PineappleIcon";
import WorkspaceNav, { WorkspaceMobileNav } from "./workspace-nav";
import WorkspaceSidebarFooter from "./workspace-sidebar-footer";
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
    <div className="flex min-h-screen bg-slate-950">

      {/* SIDEBAR — desktop only */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-56 bg-slate-950 border-r border-white/6 z-20">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-4 py-[1.1rem] border-b border-white/6 hover:bg-white/3 transition"
        >
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300 shrink-0">
            <PineappleIcon className="w-4 h-4 text-slate-900" />
          </div>
          <span className="font-bold text-white tracking-tight text-sm">ANALAS</span>
        </Link>

        {/* Workspace info */}
        <div className="px-4 py-3.5 border-b border-white/6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Workspace</div>
          <div className="font-semibold text-white text-sm truncate">{workspace.name}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50">{workspace.plan}</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">{membership?.role ?? "OWNER"}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4">
          <WorkspaceNav workspaceId={workspace.id} />
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-white/6">
          <WorkspaceSidebarFooter />
        </div>
      </aside>

      {/* MOBILE HEADER — top */}
      <div className="md:hidden sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-white/6">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300 shadow-md shadow-emerald-500/20">
              <PineappleIcon className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">{workspace.name}</span>
          </Link>
          <Link href="/dashboard" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            Dashboard
          </Link>
        </div>
      </div>

      {/* MOBILE NAV — bottom */}
      <WorkspaceMobileNav workspaceId={workspace.id} />

      {/* CONTENT */}
      <main className="flex-1 md:ml-56 min-h-screen bg-linear-to-br from-slate-900 via-slate-900 to-slate-950">
        <div className="relative">
          {/* Subtle ambient blobs */}
          <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl" />
          <div className="pointer-events-none fixed bottom-0 left-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />
          <div className="relative max-w-5xl mx-auto px-6 py-8 pb-24 md:pb-8">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}
