"use client";

import { useState } from "react";

export default function InsightsClient({ workspaceId }: { workspaceId: string }) {
  const [name, setName] = useState("");
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/workspace/${workspaceId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, eventName }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create insight");
      setLoading(false);
      return;
    }

    window.location.reload();
  };

  return (
    <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Create insight</h3>
        <p className="text-sm text-white/70">Count events for a chosen capture name.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-white/80">Insight name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/70"
            placeholder="Signup count"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-white/80">Capture event name</span>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/70"
            placeholder="user_signup"
          />
        </label>
      </div>

      {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create insight"}
      </button>
    </form>
  );
}
