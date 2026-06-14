"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, XIcon, TrashIcon, UsersIcon, KeyIcon, MailIcon } from "@/components/icons";
import PineappleIcon from "@/components/PineappleIcon";

type WorkspaceMemberItem = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
};

type WorkspaceItem = {
  id: string;
  name: string;
  tenantId: string;
  plan: string;
  currentMonthEvents: number;
  members: WorkspaceMemberItem[];
};

type UserWorkspaceItem = {
  workspaceId: string;
  name: string;
  role: string;
};

type UserItem = {
  id: string;
  email: string;
  phone: string;
  name: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  workspaces: UserWorkspaceItem[];
};

type Props = {
  initialWorkspaces: WorkspaceItem[];
  initialUsers: UserItem[];
};

export default function AdminClient({ initialWorkspaces, initialUsers }: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(initialWorkspaces);
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"workspaces" | "users">("workspaces");
  
  const [wipingWs, setWipingWs] = useState<WorkspaceItem | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<UserItem | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.members.some(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.toLowerCase().includes(search.toLowerCase())
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

  async function handleToggleVerification(userId: string, type: "email" | "phone", currentStatus: boolean) {
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/users/toggle-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type, verified: !currentStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, [type === "email" ? "emailVerified" : "phoneVerified"]: !currentStatus }
              : u
          )
        );
        setWorkspaces((prev) =>
          prev.map((w) => ({
            ...w,
            members: w.members.map((m) =>
              m.userId === userId
                ? { ...m, [type === "email" ? "emailVerified" : "phoneVerified"]: !currentStatus }
                : m
            ),
          }))
        );
        setToast({ ok: true, text: `Successfully toggled ${type} verification.` });
      } else {
        const d = await res.json();
        setToast({ ok: false, text: d.error || "Failed to toggle verification." });
      }
    } catch {
      setToast({ ok: false, text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleChangePassword() {
    if (!changingPasswordUser || !newPasswordVal.trim()) return;
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: changingPasswordUser.id, newPassword: newPasswordVal }),
      });
      if (res.ok) {
        setToast({ ok: true, text: `Password for ${changingPasswordUser.email} updated successfully.` });
        setChangingPasswordUser(null);
        setNewPasswordVal("");
      } else {
        const d = await res.json();
        setToast({ ok: false, text: d.error || "Failed to update password." });
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between border-b border-white/10 pb-4">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">System Admin Panel</h1>
              <p className="text-xs text-white/40 mt-1">Manage global system resources, workspaces, and users.</p>
            </div>
            
            {/* Tabs Selector */}
            <div className="flex gap-6">
              <button
                onClick={() => {
                  setActiveTab("workspaces");
                  setSearch("");
                }}
                className={`pb-2 text-sm font-bold tracking-tight border-b-2 transition duration-200 cursor-pointer ${
                  activeTab === "workspaces"
                    ? "border-purple-500 text-white"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                Workspaces ({workspaces.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("users");
                  setSearch("");
                }}
                className={`pb-2 text-sm font-bold tracking-tight border-b-2 transition duration-200 cursor-pointer ${
                  activeTab === "users"
                    ? "border-purple-500 text-white"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                Users & Access ({users.length})
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder={activeTab === "workspaces" ? "Search by workspace or member..." : "Search by name, email, phone..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-purple-400/40 transition placeholder:text-white/25"
            />
            <div className="text-xs text-white/40 font-mono hidden sm:block">
              Filtered: {activeTab === "workspaces" ? filteredWorkspaces.length : filteredUsers.length}
            </div>
          </div>
        </div>

        {/* WORKSPACES TAB CONTENT */}
        {activeTab === "workspaces" && (
          <div className="space-y-3">
            {filteredWorkspaces.length ? (
              filteredWorkspaces.map((w) => {
                const owner = w.members.find((m) => m.role === "OWNER");
                return (
                  <div
                    key={w.id}
                    className="rounded-2xl border border-white/8 bg-white/3 p-5 flex flex-col gap-4 hover:bg-white/5 transition duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                            <span className="font-semibold text-white/30">Owner:</span>{" "}
                            {owner ? `${owner.name} (${owner.email})` : "No Owner Assigned"}
                          </div>
                          <div>
                            <span className="font-semibold text-white/30">Tenant ID:</span>{" "}
                            <code className="text-[10px] font-mono bg-black/20 px-1 py-0.5 rounded">{w.tenantId}</code>
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

                    {/* Workspace Members list */}
                    <div className="border-t border-white/5 pt-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
                        Workspace Members ({w.members.length})
                      </h4>
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {w.members.map((m) => (
                          <div
                            key={m.userId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/4"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                              <p className="text-[10px] text-white/45 truncate">{m.email}</p>
                              {m.phone && <p className="text-[9px] text-white/30 truncate">{m.phone}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  m.role === "OWNER"
                                    ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
                                    : m.role === "ADMIN"
                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                    : "bg-slate-500/10 border-slate-500/20 text-slate-300"
                                }`}
                              >
                                {m.role}
                              </span>
                              <div className="flex gap-1">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${m.emailVerified ? "bg-emerald-400" : "bg-amber-400"}`}
                                  title={m.emailVerified ? "Email Verified" : "Email Unverified"}
                                />
                                {m.phone && (
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${m.phoneVerified ? "bg-emerald-400" : "bg-amber-400"}`}
                                    title={m.phoneVerified ? "Phone Verified" : "Phone Unverified"}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-sm text-white/40">
                No workspaces found.
              </div>
            )}
          </div>
        )}

        {/* USERS TAB CONTENT */}
        {activeTab === "users" && (
          <div className="space-y-3">
            {filteredUsers.length ? (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="rounded-2xl border border-white/8 bg-white/3 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition duration-300"
                >
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-bold text-white text-base truncate">{u.name}</h3>
                      <span className="text-xs text-white/40 font-mono">({u.id})</span>
                    </div>

                    <div className="grid gap-x-6 gap-y-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 text-xs text-white/45">
                      <div className="flex items-center gap-1.5">
                        <MailIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-white/30">Phone:</span> {u.phone || "Not set"}
                      </div>
                      <div className="flex gap-2">
                        {/* Interactive Verification Badges */}
                        <button
                          onClick={() => handleToggleVerification(u.id, "email", u.emailVerified)}
                          disabled={loading}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 ${
                            u.emailVerified
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                          }`}
                          title="Click to toggle email verification status"
                        >
                          <span className={`w-1 h-1 rounded-full ${u.emailVerified ? "bg-emerald-400" : "bg-amber-400"}`} />
                          Email
                        </button>

                        <button
                          onClick={() => {
                            if (!u.phone) return;
                            handleToggleVerification(u.id, "phone", u.phoneVerified);
                          }}
                          disabled={loading || !u.phone}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition duration-200 ${
                            !u.phone
                              ? "bg-white/5 border-white/10 text-white/25 cursor-not-allowed"
                              : u.phoneVerified
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                          } disabled:opacity-50`}
                          title={u.phone ? "Click to toggle phone verification status" : "No phone number available"}
                        >
                          <span className={`w-1 h-1 rounded-full ${!u.phone ? "bg-white/20" : u.phoneVerified ? "bg-emerald-400" : "bg-amber-400"}`} />
                          Mobile
                        </button>
                      </div>
                    </div>

                    {/* Member's Workspaces */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">
                        Workspaces & Roles
                      </div>
                      {u.workspaces.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {u.workspaces.map((ws) => (
                            <span
                              key={ws.workspaceId}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/8 text-[10px] text-white/70"
                            >
                              {ws.name}
                              <span
                                className={`text-[8px] font-bold uppercase ${
                                  ws.role === "OWNER"
                                    ? "text-violet-400"
                                    : ws.role === "ADMIN"
                                    ? "text-blue-400"
                                    : "text-slate-400"
                                }`}
                              >
                                ({ws.role})
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/25 italic">Not assigned to any workspaces.</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 w-full md:w-auto mt-2 md:mt-0">
                    <button
                      onClick={() => setChangingPasswordUser(u)}
                      className="w-full md:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <KeyIcon className="w-3.5 h-3.5 text-white/50" />
                      Change Password
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-sm text-white/40">
                No users found.
              </div>
            )}
          </div>
        )}
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
              This action cannot be undone. All captures and custom events for this workspace will be deleted forever.
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

      {/* CHANGE PASSWORD MODAL */}
      {changingPasswordUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <KeyIcon className="w-4.5 h-4.5 text-purple-400" />
                Change Password
              </h3>
              <button
                onClick={() => {
                  setChangingPasswordUser(null);
                  setNewPasswordVal("");
                }}
                className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition"
              >
                <XIcon className="w-4.5 h-4.5" />
              </button>
            </div>

            <p className="text-xs text-white/50 leading-relaxed">
              Set a new secure password for user <strong>{changingPasswordUser.email}</strong>.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">New Password</label>
              <input
                type="password"
                placeholder="Min 6 characters..."
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-purple-400/40 transition placeholder:text-white/20"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setChangingPasswordUser(null);
                  setNewPasswordVal("");
                }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                disabled={loading || newPasswordVal.trim().length < 6}
                onClick={handleChangePassword}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:hover:bg-purple-600"
              >
                {loading ? "Saving..." : "Save Password"}
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

