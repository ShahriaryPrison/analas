"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getInsightType } from "@/lib/insight-types";
import { CheckIcon, ActivityIcon, XIcon } from "@/components/icons";

type Props = {
  workspaceId: string;
  insight: {
    id: string;
    name: string;
    type: string;
    queryConfig: Record<string, unknown>;
  };
  onClose: () => void;
};

export default function EditInsightModal({ workspaceId, insight, onClose }: Props) {
  const router = useRouter();
  const typeDef = getInsightType(insight.type);

  // Pull string-valued keys out of queryConfig for the form fields
  const [name, setName] = useState(insight.name);
  const [queryConfig, setQueryConfig] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(insight.queryConfig)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => [k, v as string])
    )
  );
  const [eventLabels, setEventLabels] = useState<Record<string, string>>(
    (insight.queryConfig.eventLabels as Record<string, string>) ?? {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Events list derived from the multi-event fields, kept reactive to edits
  const multiKey =
    insight.type === "multi_trend"
      ? "eventNames"
      : insight.type === "funnel"
      ? "eventSteps"
      : null;

  const currentEvents = useMemo(() => {
    if (!multiKey) return [];
    return (queryConfig[multiKey] || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }, [multiKey, queryConfig]);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/insights/${insight.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            queryConfig: { ...queryConfig, eventLabels },
          }),
        }
      );

      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to save");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">
              {typeDef.icon} {typeDef.label}
            </div>
            <h2 className="text-lg font-bold text-white">Edit Insight</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60 block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-semibold outline-none focus:ring-2 focus:ring-emerald-400/40 transition placeholder:text-white/20"
            />
          </div>

          {/* Config fields (same as builder step 2) */}
          {typeDef.configFields.map((f) => (
            <div key={f.key} className="space-y-2">
              <label className="text-sm font-medium text-white/60 block">{f.label}</label>

              {f.options ? (
                <div className="flex flex-wrap gap-2">
                  {f.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setQueryConfig({ ...queryConfig, [f.key]: opt.value })
                      }
                      className={`px-4 py-2 rounded-xl text-sm border transition ${
                        queryConfig[f.key] === opt.value
                          ? "bg-emerald-400 text-slate-900 border-emerald-400 font-bold"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={queryConfig[f.key] || ""}
                    onChange={(e) =>
                      setQueryConfig({ ...queryConfig, [f.key]: e.target.value })
                    }
                    placeholder={f.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400/40 transition placeholder:text-white/20 pr-10"
                  />
                  {(f.key === "eventName" ||
                    f.key === "eventNames" ||
                    f.key === "eventSteps" ||
                    f.key === "startEvent" ||
                    f.key === "returnEvent") && (
                    <ActivityIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  )}
                </div>
              )}

              {/* Event Labels — shown below eventNames / eventSteps */}
              {(f.key === "eventNames" || f.key === "eventSteps") &&
                currentEvents.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5 mt-3">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                      Event Labels{" "}
                      <span className="normal-case font-normal opacity-60">
                        (optional)
                      </span>
                    </div>
                    {currentEvents.map((ev) => (
                      <div key={ev} className="flex items-center gap-3">
                        <span className="text-[11px] text-white/30 font-mono truncate flex-1 min-w-0">
                          {ev}
                        </span>
                        <span className="text-white/20 text-xs shrink-0">→</span>
                        <input
                          value={eventLabels[ev] || ""}
                          onChange={(e) =>
                            setEventLabels((prev) => ({
                              ...prev,
                              [ev]: e.target.value,
                            }))
                          }
                          placeholder="Custom label..."
                          className="w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-400/40 transition placeholder:text-white/20 shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))}

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/5 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 border border-white/10 text-white/50 rounded-xl font-bold hover:bg-white/10 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="flex-[2] py-3 bg-emerald-400 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-300 transition disabled:opacity-30"
          >
            {loading ? "Saving..." : "Save Changes"}
            {!loading && <CheckIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
