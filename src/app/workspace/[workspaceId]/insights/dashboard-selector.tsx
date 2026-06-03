"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon, CheckIcon, XIcon } from "@/components/icons";
import { getEffectivePlan } from "@/lib/billing/plans";

type Dashboard = {
  id: string;
  name: string;
  isPublic: boolean;
};

type Props = {
  workspaceId: string;
  dashboards: Dashboard[];
  activeDashboard: Dashboard;
  plan: any;
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export default function DashboardSelector({
  workspaceId,
  dashboards,
  activeDashboard,
  plan,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // Modals state
  const [showCreate, setShowCreate] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  // Form input states
  const [newName, setNewName] = useState("");
  const [renameName, setRenameName] = useState(activeDashboard.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Limits
  const planConfig = getEffectivePlan(plan);
  const maxDashboards = planConfig.maxDashboards;
  const isAtLimit = dashboards.length >= maxDashboards;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/dashboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewName("");
        setShowCreate(false);
        setIsOpen(false);
        router.push(`/workspace/${workspaceId}/insights?dashboardId=${data.dashboard.id}`);
        router.refresh();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename() {
    if (!renameName.trim() || renameName.trim() === activeDashboard.name) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/dashboards/${activeDashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      });
      if (res.ok) {
        setShowRename(false);
        setIsOpen(false);
        router.refresh();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to rename dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/dashboards/${activeDashboard.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDelete(false);
        setIsOpen(false);
        // Find next dashboard to navigate to
        const remaining = dashboards.filter((d) => d.id !== activeDashboard.id);
        if (remaining.length > 0) {
          router.push(`/workspace/${workspaceId}/insights?dashboardId=${remaining[0].id}`);
        } else {
          router.push(`/workspace/${workspaceId}/insights`);
        }
        router.refresh();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to delete dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/8 bg-white/4 text-sm font-bold text-white hover:bg-white/8 hover:border-white/15 transition active:scale-[0.98] cursor-pointer"
        >
          <span>{activeDashboard.name}</span>
          <ChevronDownIcon className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/30">
            Dashboards ({dashboards.length} / {maxDashboards})
          </div>
          
          <div className="max-h-56 overflow-y-auto scrollbar-thin py-1">
            {dashboards.map((d) => {
              const isActive = d.id === activeDashboard.id;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/workspace/${workspaceId}/insights?dashboardId=${d.id}`);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition flex items-center justify-between group ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-300 font-semibold border-y border-white/5"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="truncate">{d.name}</span>
                  {isActive && <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-white/5 my-1.5" />

          {/* Action links */}
          <div className="px-1.5 space-y-0.5">
            <button
              onClick={() => {
                setRenameName(activeDashboard.name);
                setError("");
                setShowRename(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition"
            >
              <PencilIcon className="w-3.5 h-3.5 opacity-60" />
              Rename active
            </button>

            <button
              disabled={dashboards.length <= 1}
              onClick={() => {
                setError("");
                setShowDelete(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-rose-400/80"
              title={dashboards.length <= 1 ? "A workspace must have at least 1 dashboard" : undefined}
            >
              <TrashIcon className="w-3.5 h-3.5 opacity-80" />
              Delete active
            </button>

            <div className="h-px bg-white/5 my-1" />

            <button
              onClick={() => {
                if (isAtLimit) {
                  setShowUpgrade(true);
                } else {
                  setNewName("");
                  setError("");
                  setShowCreate(true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Create Dashboard
            </button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Create Dashboard</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/45 -mt-2">Provide a name for your new dashboard canvas.</p>
            
            <div className="space-y-1">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Conversion Funnels"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400/40 transition"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                disabled={loading || !newName.trim()}
                onClick={handleCreate}
                className="flex-1 py-2.5 bg-emerald-400 text-slate-900 rounded-xl text-sm font-bold hover:bg-emerald-300 transition disabled:opacity-40"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {showRename && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Rename Dashboard</h3>
              <button onClick={() => setShowRename(false)} className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              <input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="e.g. Acquisition Overview"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400/40 transition"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
              {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowRename(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                disabled={loading || !renameName.trim() || renameName.trim() === activeDashboard.name}
                onClick={handleRename}
                className="flex-1 py-2.5 bg-emerald-400 text-slate-900 rounded-xl text-sm font-bold hover:bg-emerald-300 transition disabled:opacity-40"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL (CASCADE WARNING) */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Delete Dashboard</h3>
              <button onClick={() => setShowDelete(false)} className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider">⚠️ Permanent Deletion Notice</h4>
              <p className="text-xs leading-relaxed">
                This will permanently delete the dashboard <strong>{activeDashboard.name}</strong> and <strong>all insights</strong> placed on it. This action cannot be undone.
              </p>
            </div>
            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition"
              >
                {loading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE LIMIT MODAL */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-500/15 rounded-2xl flex items-center justify-center border border-amber-500/25 text-amber-400 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            
            <div>
              <h3 className="font-bold text-white text-lg">Dashboard Limit Reached</h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Your workspace is on the <strong>{planConfig.name}</strong> plan, which is limited to <strong>{maxDashboards}</strong> {maxDashboards === 1 ? "dashboard" : "dashboards"}.
              </p>
            </div>
            
            <p className="text-xs text-white/40 leading-relaxed bg-white/3 border border-white/5 rounded-2xl p-4">
              Upgrade to a premium tier to unlock additional dashboards, higher event capacity, and extended data retention.
            </p>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowUpgrade(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/10 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowUpgrade(false);
                  setIsOpen(false);
                  router.push(`/workspace/${workspaceId}/settings`);
                }}
                className="flex-1 py-2.5 bg-emerald-400 text-slate-900 rounded-xl text-sm font-bold hover:bg-emerald-300 transition"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
