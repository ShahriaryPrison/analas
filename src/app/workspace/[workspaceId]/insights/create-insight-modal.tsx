"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { INSIGHT_TYPES, getInsightType } from "@/lib/insight-types";
import { XIcon, CheckIcon, ChevronRightIcon } from "@/components/icons";
import Link from "next/link";

type Props = {
  workspaceId: string;
  topEvents: string[];
  onClose: () => void;
};

export default function CreateInsightModal({ workspaceId, topEvents, onClose }: Props) {
  const router = useRouter();
  const [type, setType] = useState("trend");
  const [name, setName] = useState("");
  const [queryConfig, setQueryConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedType = getInsightType(type);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/workspace/${workspaceId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, queryConfig }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create insight");
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl max-h-[90dvh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-semibold text-white">New insight</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Insight type
            </span>
            <div className="grid grid-cols-2 gap-3">
              {INSIGHT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    type === t.id
                      ? "border-emerald-400/60 bg-emerald-400/10 ring-1 ring-emerald-400/40"
                      : "border-white/10 bg-white/5 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-mono">{t.icon}</span>
                    <span className="font-semibold text-white text-sm">{t.label}</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <label className="block space-y-1.5 text-sm">
            <span className="text-white/70">Insight name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-400/60 placeholder:text-white/30"
              placeholder="Signup count"
            />
          </label>

          {/* Dynamic Config Fields */}
          {selectedType.configFields.map((field) => (
            <div key={field.key} className="space-y-1.5 text-sm">
              <span className="text-white/70">{field.label}</span>
              <input
                value={queryConfig[field.key] || ""}
                onChange={(e) => setQueryConfig({ ...queryConfig, [field.key]: e.target.value })}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-400/60 placeholder:text-white/30"
                placeholder={field.placeholder}
              />
              {field.key === "eventName" && topEvents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {topEvents.map((ev) => (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => setQueryConfig({ ...queryConfig, [field.key]: ev })}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                        queryConfig[field.key] === ev
                          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                          : "border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {ev}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/docs/insight-types"
              target="_blank"
              className="text-xs text-white/30 hover:text-white/60 transition text-center sm:text-left"
            >
              <span className="flex items-center justify-center gap-1 sm:justify-start">Contribute an insight type <ChevronRightIcon className="w-3 h-3" /></span>
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 transition sm:flex-none sm:py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition disabled:opacity-60 sm:flex-none sm:py-2"
              >
                {loading ? "Creating…" : <><CheckIcon className="w-3.5 h-3.5" />Create</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
