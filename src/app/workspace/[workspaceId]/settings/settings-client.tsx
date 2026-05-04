"use client";

import { useState } from "react";

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

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="mt-0.5 text-sm text-white/60">
            Keys authenticate event capture requests from your app.
          </p>
        </div>
        <button
          onClick={createKey}
          disabled={creating}
          className="shrink-0 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {creating ? "Creating…" : "New key"}
        </button>
      </div>

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
              className="shrink-0 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-300 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/50">Test it with cURL:</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/70 px-3 py-2.5 text-[11px] text-white/70 whitespace-pre">{`curl -X POST '${typeof window !== "undefined" ? window.location.origin : ""}/api/capture' \\
  -H 'Authorization: Bearer ${newKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{"event":"test_event","properties":{"source":"curl"}}'`}</pre>
          </div>

          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-white/40 hover:text-white/70 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-2">
        {keys.length ? (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">{k.name}</div>
                <div className="text-xs text-white/50">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => revokeKey(k.id)}
                disabled={revoking === k.id}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
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
