"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, XIcon, TrashIcon } from "@/components/icons";
import PineappleIcon from "@/components/PineappleIcon";

type WorkspaceItem = {
  id: string;
  name: string;
  tenantId: string;
  plan: string;
  currentMonthEvents: number;
  ownerEmail: string;
  ownerName: string;
};

type Props = {
  initialWorkspaces: WorkspaceItem[];
};

export default function AdminClient({ initialWorkspaces }: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(initialWorkspaces);
  const [search, setSearch] = useState("");
  const [wipingWs, setWipingWs] = useState<WorkspaceItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.ownerEmail.toLowerCase().includes(search.toLowerCase())
  );

  async function handleWipe() {
    if (!wipingWs) return;
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/wipe-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: wipingWs.id }),
      });
      if (res.ok) {
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === wipingWs.id ? { ...w, currentMonthEvents: 0 } : w))
        );
        setToast({ ok: true, text: `Data for "${wipingWs.name}" wiped successfully.` });
        setWipingWs(null);
      } else {
        const d = await res.json();
        setToast({ ok: false, text: d.error || "Failed to wipe workspace data." });
      }
    } catch {
      setToast({ ok: false, text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-white/6 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-br from-purple-450 to-indigo-550 shadow-md">
              <PineappleIcon className="w-4.5 h-4.5 text-slate-950" />
            </div>
            <span className="text-base font-bold tracking-tight">ANALAS SYSTEM ADMIN</span>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/8 bg-white/4 px-4 py-1.5 text-sm text-white/85 hover:bg-white/8 transition cursor-pointer"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">System Workspaces</h1>
            <p className="text-xs text-white/40 mt-1">Manage global user workspaces and trigger data purge actions.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search by workspace or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-purple-400/40 transition placeholder:text-white/25"
            />
            <div className="text-xs text-white/40 font-mono">
              Total: {filteredWorkspaces.length}
            </div>
          </div>
        </div>

        {/* Workspaces list */}
        <div className="space-y-3">
          {filteredWorkspaces.length ? (
            filteredWorkspaces.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl border border-white/8 bg-white/3 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition duration-300"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-bold text-white text-base truncate">{w.name}</h3>
                    <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                      {w.plan}
                    </span>
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-white/50">
                      {w.currentMonthEvents.toLocaleString()} events
                    </span>
                  </div>
                  
                  <div className="grid gap-x-6 gap-y-1 grid-cols-1 sm:grid-cols-2 text-xs text-white/45">
                    <div>
                      <span className="font-semibold text-white/30">Owner:</span> {w.ownerName} ({w.ownerEmail})
                    </div>
                    <div>
                      <span className="font-semibold text-white/30">Tenant ID:</span> <code className="text-[10px] font-mono bg-black/20 px-1 py-0.5 rounded">{w.tenantId}</code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <button
                    onClick={() => setWipingWs(w)}
                    className="w-full md:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/15 transition cursor-pointer animate-pulse"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Wipe Data
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-sm text-white/40">
              No workspaces found.
            </div>
          )}
        </div>
      </main>

      {/* CONFIRM WIPE MODAL */}
      {wipingWs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">System Wipe Workspace</h3>
              <button onClick={() => setWipingWs(null)} className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider">⚠️ Destructive Admin Action</h4>
              <p className="text-xs leading-relaxed">
                This will delete **all ClickHouse captures** for the workspace <strong>{wipingWs.name}</strong> and reset its monthly ingestion count in Postgres to **0**.
              </p>
            </div>
            
            <p className="text-xs text-white/45 leading-relaxed">
              This request was submitted by owner <strong>{wipingWs.ownerEmail}</strong>. Wiping cannot be undone.
            </p>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setWipingWs(null)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleWipe}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition"
              >
                {loading ? "Wiping..." : "Confirm Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-2xl text-sm font-medium max-w-sm backdrop-blur-sm transition-all duration-300 ${
            toast.ok
              ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200 shadow-emerald-900/50"
              : "bg-red-900/90 border-red-500/40 text-red-200 shadow-red-950/50"
          }`}
        >
          <div className={`shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${toast.ok ? "bg-emerald-500/30" : "bg-red-500/30"}`}>
            {toast.ok ? <CheckIcon className="w-3 h-3 text-emerald-300" /> : <XIcon className="w-3 h-3 text-red-300" />}
          </div>
          <span className="flex-1 leading-snug">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="shrink-0 text-white/30 hover:text-white/70 transition"
            aria-label="Dismiss"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
