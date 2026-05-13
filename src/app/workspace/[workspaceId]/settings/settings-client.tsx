"use client";

import { useState } from "react";
import { PlusIcon, KeyIcon, CopyIcon, CheckIcon, TrashIcon } from "@/components/icons";

type ApiKey = { id: string; name: string; createdAt: string };

export default function SettingsClient({
  workspaceId,
  initialKeys,
}: {
  workspaceId: string;
  initialKeys: ApiKey[];
}) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [lang, setLang] = useState<"js" | "curl">("curl");

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/api-keys`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.rawKey);
        setKeys((prev) => [
          { id: data.id, name: data.name, createdAt: new Date().toISOString() },
          ...prev,
        ]);
      }
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: string) {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } finally {
      setRevoking(null);
    }
  }

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

  const jsCode = `fetch('${typeof window !== "undefined" ? window.location.origin : ""}/api/capture', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${newKey}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify([\n    {\n      event: 'test_event',\n      userId: 'user_123',\n      sessionId: 'sess_abc',\n      properties: { source: 'js' }\n    }\n  ])\n})`;
  const curlCode = `curl -X POST '${typeof window !== "undefined" ? window.location.origin : ""}/api/capture' \\\n  -H 'Authorization: Bearer ${newKey}' \\\n  -H 'Content-Type: application/json' \\\n  -d '[{"event":"test_event","userId":"user_123","sessionId":"sess_abc","properties":{"source":"curl"}}]'`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
      {/* Section header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="mt-0.5 text-sm text-white/50">
            Keys authenticate event capture requests from your app.
          </p>
        </div>
        <button
          onClick={createKey}
          disabled={creating}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60 sm:shrink-0 sm:py-2"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          {creating ? "Creating…" : "New key"}
        </button>
      </div>

      {/* New key reveal banner */}
      {newKey && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
          <p className="text-sm font-medium text-emerald-300">
            New key created — copy it now, you won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-slate-800/60 px-3 py-2 text-xs font-mono text-white">
              {newKey}
            </code>
            <button
              onClick={() => copy(newKey)}
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-300 transition"
            >
              {copied ? (
                <CheckIcon className="w-3.5 h-3.5" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
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
              <pre className="overflow-x-auto rounded-lg bg-slate-950/70 border border-white/6 p-3 pr-10 text-[11px] text-white/60 whitespace-pre-wrap">
                {lang === "js" ? jsCode : curlCode}
              </pre>
              <button
                onClick={() => copyCode(lang === "js" ? jsCode : curlCode)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/50"
              >
                {codeCopied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-white/40 hover:text-white/70 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Key list */}
      <div className="space-y-2">
        {keys.length ? (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 shrink-0">
                  <KeyIcon className="w-3.5 h-3.5 text-white/40" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{k.name}</div>
                  <div className="text-xs text-white/40">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => revokeKey(k.id)}
                disabled={revoking === k.id}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50 sm:py-1.5 sm:shrink-0"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                {revoking === k.id ? "Revoking…" : "Revoke"}
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/50">
            No API keys yet. Create one to start sending events.
          </div>
        )}
      </div>
    </div>
  );
}
