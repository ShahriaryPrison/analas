"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PineappleIcon from "@/components/PineappleIcon";
import { signOut } from "next-auth/react";

type Workspace = {
  id: string;
  name: string;
  tenantId: string;
  plan: string;
  role: string;
  apiKeyCount: number;
  memberCount: number;
};

export default function DashboardClient({ workspaces }: { workspaces: Workspace[] }) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const k = sp.get("newKey");
    if (k) setNewKey(k);
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showKeyBanner = newKey && !dismissed;
  const firstWorkspace = workspaces[0];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top nav */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 shadow-md">
              <PineappleIcon className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-lg font-bold tracking-tight">ANALAS</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── API key banner (show-once on first login) ── */}
        {showKeyBanner && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-400 text-lg">✓</span>
                  <h2 className="font-semibold text-emerald-300">Your workspace is ready</h2>
                </div>
                <p className="text-sm text-white/60">
                  Copy your API key now — it won&apos;t be shown again.
                </p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="text-white/30 hover:text-white/60 text-xl leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>

            {/* Key copy row */}
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-xs font-mono text-white">
                {newKey}
              </code>
              <button
                onClick={() => copy(newKey!)}
                className="shrink-0 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition min-w-[80px]"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Quick-start steps */}
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              {[
                {
                  step: "1",
                  label: "Send an event",
                  code: `fetch('/api/capture', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${newKey}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    event: 'user_signup'\n  })\n})`,
                },
                {
                  step: "2",
                  label: "View captures",
                  desc: firstWorkspace
                    ? `Go to your workspace → Captures tab to see incoming events in real time.`
                    : "Open your workspace and go to the Captures tab.",
                },
                {
                  step: "3",
                  label: "Save an insight",
                  desc: "Go to the Insights tab and create a named metric to track an event over time.",
                },
              ].map(({ step, label, code, desc }) => (
                <div key={step} className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                      {step}
                    </span>
                    <span className="font-medium text-white">{label}</span>
                  </div>
                  {code ? (
                    <pre className="overflow-x-auto rounded-lg bg-slate-950/60 p-2 text-[10px] text-white/70 whitespace-pre-wrap">
                      {code}
                    </pre>
                  ) : (
                    <p className="text-white/60 text-xs">{desc}</p>
                  )}
                </div>
              ))}
            </div>

            {firstWorkspace && (
              <Link
                href={`/workspace/${firstWorkspace.id}/captures`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition"
              >
                Open workspace →
              </Link>
            )}
          </div>
        )}

        {/* ── Workspaces ── */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Workspaces</h2>
              <p className="text-sm text-white/50 mt-0.5">
                Each workspace has its own API keys, event data, and team.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {workspaces.length ? (
              workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="rounded-xl border border-white/10 bg-slate-900/50 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{ws.name}</h3>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        {ws.role === "OWNER" ? "Owner" : ws.role}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                        {ws.plan}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-white/50">
                      <span>{ws.apiKeyCount} key{ws.apiKeyCount !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{ws.memberCount} member{ws.memberCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Link
                      href={`/workspace/${ws.id}/captures`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition"
                    >
                      Captures
                    </Link>
                    <Link
                      href={`/workspace/${ws.id}/insights`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition"
                    >
                      Insights
                    </Link>
                    <Link
                      href={`/workspace/${ws.id}/settings`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition"
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
                <p className="text-sm text-white/50">No workspaces yet.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
