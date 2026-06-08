"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PineappleIcon from "@/components/PineappleIcon";
import { signOut } from "next-auth/react";
import {
  LogOutIcon, KeyIcon, UsersIcon, ZapIcon, BarChart2Icon,
  SlidersIcon, CopyIcon, CheckIcon, XIcon, SparklesIcon, ChevronRightIcon,
} from "@/components/icons";

type Workspace = {
  id: string;
  name: string;
  tenantId: string;
  plan: string;
  role: string;
  apiKeyCount: number;
  memberCount: number;
};

export default function DashboardClient({ workspaces: initialWorkspaces }: { workspaces: Workspace[] }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lang, setLang] = useState<"js" | "curl">("curl");
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  async function leaveWorkspace(workspaceId: string) {
    setLeavingId(workspaceId);
    setLeaveError(null);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/members/leave`, { method: "POST" });
      if (res.ok) {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== workspaceId));
      } else {
        const data = await res.json();
        setLeaveError(data.error ?? "Failed to leave workspace.");
      }
    } finally {
      setLeavingId(null);
    }
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const k = sp.get("newKey");
    if (k) setNewKey(k);
    setOrigin(window.location.origin);
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyCode(text: string) {
    navigator.clipboard.writeText(text);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  const showKeyBanner = newKey && !dismissed;
  const firstWorkspace = workspaces[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-white/6 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300 shadow-md shadow-emerald-500/20">
              <PineappleIcon className="w-4.5 h-4.5 text-slate-900" />
            </div>
            <span className="text-base font-bold tracking-tight">ANALAS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-sm text-white/60 hover:bg-white/8 hover:text-white/95 transition"
            >
              <SlidersIcon className="w-3.5 h-3.5 text-white/40" />
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-sm text-white/60 hover:bg-white/8 hover:text-white/95 transition"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── API key banner ── */}
        {showKeyBanner && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckIcon className="w-3 h-3 text-emerald-400" />
                  </div>
                  <h2 className="font-semibold text-emerald-300">Your workspace is ready</h2>
                </div>
                <p className="text-sm text-white/50">Copy your API key now — it won&apos;t be shown again.</p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition"
                aria-label="Dismiss"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Key copy row */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-xs font-mono text-white/90">
                {newKey}
              </code>
              <button
                onClick={() => copy(newKey!)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition sm:shrink-0 sm:min-w-[90px]"
              >
                {copied ? <><CheckIcon className="w-3.5 h-3.5" />Copied</> : <><CopyIcon className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>

            {/* Quick-start steps */}
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              {[
                {
                  step: "1",
                  label: "Send an event",
                  jsCode: `fetch('${origin}/api/capture', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${newKey}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    event: 'user_signup'\n  })\n})`,
                  curlCode: `curl -X POST ${origin}/api/capture \\\n  -H 'Authorization: Bearer ${newKey}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"event":"user_signup"}'`,
                },
                {
                  step: "2",
                  label: "View captures",
                  desc: firstWorkspace ? "Go to your workspace → Captures to see events arrive in real time." : "Open your workspace and go to the Captures tab.",
                },
                {
                  step: "3",
                  label: "Save an insight",
                  desc: "Go to Insights and create a named metric to track an event over time.",
                },
              ].map(({ step, label, jsCode, curlCode, desc }) => (
                <div key={step} className="rounded-xl border border-white/8 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">{step}</span>
                    <span className="font-medium text-white">{label}</span>
                  </div>
                  {jsCode && curlCode ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {(["curl", "js"] as const).map((l) => (
                          <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${lang === l ? "bg-emerald-500/25 text-emerald-300" : "text-white/40 hover:text-white/60"}`}
                          >
                            {l === "js" ? "JS" : "cURL"}
                          </button>
                        ))}
                      </div>
                      <div className="relative group">
                        <pre className="overflow-x-auto rounded-lg bg-slate-950/70 border border-white/6 p-2 pr-10 text-[10px] text-white/60 whitespace-pre-wrap">
                          {lang === "js" ? jsCode : curlCode}
                        </pre>
                        <button
                          onClick={() => copyCode(lang === "js" ? jsCode! : curlCode!)}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition p-1 rounded bg-white/10 hover:bg-white/20 text-white/50"
                        >
                          {codeCopied ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <CopyIcon className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/50 text-xs leading-relaxed">{desc}</p>
                  )}
                </div>
              ))}
            </div>

            {firstWorkspace && (
              <Link
                href={`/workspace/${firstWorkspace.id}/captures`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition"
              >
                Open workspace
                <ChevronRightIcon className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {/* ── Workspaces ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Workspaces</h2>
              <p className="text-sm text-white/40 mt-0.5">Each workspace has its own API keys, event data, and team.</p>
            </div>
          </div>

          <div className="space-y-2">
            {workspaces.length ? (
              workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="rounded-2xl border border-white/8 bg-white/3 p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 text-emerald-300 font-bold text-sm">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{ws.name}</h3>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          {ws.role === "OWNER" ? "Owner" : ws.role}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                          {ws.plan}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <KeyIcon className="w-3 h-3" />
                          {ws.apiKeyCount} {ws.apiKeyCount === 1 ? "key" : "keys"}
                        </span>
                        <span className="text-white/20">·</span>
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-3 h-3" />
                          {ws.memberCount} {ws.memberCount === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap text-xs">
                    <Link
                      href={`/workspace/${ws.id}/captures`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2 md:py-1.5 text-white/60 hover:bg-white/8 hover:text-white/90 transition"
                    >
                      <ZapIcon className="w-3.5 h-3.5" />
                      Captures
                    </Link>
                    <Link
                      href={`/workspace/${ws.id}/insights`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2 md:py-1.5 text-white/60 hover:bg-white/8 hover:text-white/90 transition"
                    >
                      <BarChart2Icon className="w-3.5 h-3.5" />
                      Insights
                    </Link>
                    {/* Settings — always visible (MEMBER role can't reach the page; server redirects them) */}
                    <Link
                      href={`/workspace/${ws.id}/settings`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2 md:py-1.5 text-white/60 hover:bg-white/8 hover:text-white/90 transition"
                    >
                      <SlidersIcon className="w-3.5 h-3.5" />
                      Settings
                    </Link>
                    {ws.role !== "OWNER" && (
                      <button
                        onClick={() => leaveWorkspace(ws.id)}
                        disabled={leavingId === ws.id}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 md:py-1.5 text-xs text-red-400 hover:bg-red-500/15 transition disabled:opacity-50"
                      >
                        {leavingId === ws.id ? "Leaving…" : "Leave"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center space-y-2">
                <SparklesIcon className="w-6 h-6 text-white/20 mx-auto" />
                <p className="text-sm text-white/40">No workspaces yet.</p>
              </div>
            )}
          </div>
          {leaveError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {leaveError}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
