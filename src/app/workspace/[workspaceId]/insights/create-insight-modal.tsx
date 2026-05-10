"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { INSIGHT_TYPES, getInsightType } from "@/lib/insight-types";
import { XIcon, CheckIcon, ChevronRightIcon, ActivityIcon, BarChart2Icon } from "@/components/icons";
import { TrendChart, BreakdownList, FunnelView, type InsightData } from "./insight-card";
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
  
  // Preview states
  const [previewData, setPreviewData] = useState<InsightData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [discoveredProperties, setDiscoveredProperties] = useState<string[]>([]);

  const selectedType = getInsightType(type);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Fetch preview data when config changes
  useEffect(() => {
    const timeout = setTimeout(async () => {
      // Basic validation before previewing
      const hasRequiredFields = selectedType.configFields.every(f => queryConfig[f.key]);
      if (!hasRequiredFields) {
        setPreviewData(null);
        return;
      }

      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/insights/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, queryConfig }),
        });
        if (res.ok) setPreviewData(await res.json());
      } catch (e) {
        console.error("Preview failed", e);
      } finally {
        setPreviewLoading(false);
      }
    }, 500); // debounce

    return () => clearTimeout(timeout);
  }, [type, queryConfig, workspaceId, selectedType]);

  // Discover properties when event changes
  useEffect(() => {
    const eventName = queryConfig.eventName || queryConfig.fromEvent;
    if (!eventName) {
      setDiscoveredProperties([]);
      return;
    }

    fetch(`/api/workspace/${workspaceId}/properties?event=${eventName}`)
      .then(r => r.json())
      .then(setDiscoveredProperties)
      .catch(() => setDiscoveredProperties([]));
  }, [workspaceId, queryConfig.eventName, queryConfig.fromEvent]);

  // Auto-name
  useEffect(() => {
    if (!name) {
      const eventName = queryConfig.eventName || queryConfig.fromEvent || "";
      if (eventName) {
        setName(`${eventName} ${selectedType.label}`);
      }
    }
  }, [type, queryConfig, name, selectedType.label]);

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
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl max-h-[90dvh] flex flex-col">
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

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* Left: Configuration Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Type selector */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                1. Select insight type
              </span>
              <div className="grid grid-cols-2 gap-2">
                {INSIGHT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      type === t.id
                        ? "border-emerald-400/60 bg-emerald-400/10 ring-1 ring-emerald-400/40"
                        : "border-white/10 bg-white/5 hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-mono">{t.icon}</span>
                      <span className="font-semibold text-white text-xs">{t.label}</span>
                    </div>
                    <p className="text-[10px] text-white/40 leading-tight">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Config Fields */}
            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                2. Configure data
              </span>
              {selectedType.configFields.map((field) => (
                <div key={field.key} className="space-y-1.5 text-sm">
                  <span className="text-white/70">{field.label}</span>
                  <div className="relative">
                    {field.options ? (
                      <select
                        value={queryConfig[field.key] || field.options[0]?.value || ""}
                        onChange={(e) => setQueryConfig({ ...queryConfig, [field.key]: e.target.value })}
                        required
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/60 appearance-none"
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={queryConfig[field.key] || ""}
                        onChange={(e) => setQueryConfig({ ...queryConfig, [field.key]: e.target.value })}
                        required
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/60 placeholder:text-white/30"
                        placeholder={field.placeholder}
                      />
                    )}
                    {/* Auto-suggest dropdown for properties */}
                    {field.key === "property" && discoveredProperties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {discoveredProperties.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setQueryConfig({ ...queryConfig, [field.key]: p })}
                            className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50 hover:bg-white/20 hover:text-white transition"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(field.key === "eventName" || field.key === "eventNames" || field.key === "eventSteps") && topEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {topEvents.map((ev) => {
                        const isMulti = field.key === "eventNames" || field.key === "eventSteps";
                        const currentVal = queryConfig[field.key] || "";
                        const vals = currentVal.split(",").map(v => v.trim()).filter(Boolean);
                        const isSelected = isMulti ? vals.includes(ev) : currentVal === ev;

                        return (
                          <button
                            key={ev}
                            type="button"
                            onClick={() => {
                              if (isMulti) {
                                if (isSelected) {
                                  setQueryConfig({ ...queryConfig, [field.key]: vals.filter(v => v !== ev).join(", ") });
                                } else {
                                  setQueryConfig({ ...queryConfig, [field.key]: [...vals, ev].join(", ") });
                                }
                              } else {
                                setQueryConfig({ ...queryConfig, [field.key]: ev });
                              }
                            }}
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                              isSelected
                                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                                : "border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
                            }`}
                          >
                            {ev}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Name */}
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                3. Label your insight
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/60 placeholder:text-white/30"
                placeholder="Signup count"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Form Footer */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/docs/insight-types"
                target="_blank"
                className="text-[11px] text-white/30 hover:text-white/60 transition"
              >
                Custom insight types →
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-6 py-2 text-sm font-bold text-slate-900 hover:bg-emerald-300 transition disabled:opacity-60"
                >
                  {loading ? "Creating…" : "Save Insight"}
                </button>
              </div>
            </div>
          </form>

          {/* Right: Live Preview Panel */}
          <div className="bg-slate-950/50 p-6 flex flex-col min-h-[300px]">
             <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Live Preview
                </span>
                {previewLoading && (
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 animate-pulse">
                     <ActivityIcon className="w-3 h-3" /> Fetching real-time data...
                  </div>
                )}
             </div>

             <div className="flex-1 flex flex-col justify-center">
                {!previewData && !previewLoading ? (
                  <div className="text-center space-y-3 py-12">
                     <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5">
                        <BarChart2Icon className="w-6 h-6 text-white/20" />
                     </div>
                     <p className="text-sm text-white/30">Fill in the event name to see <br /> a live preview of your data.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Preview Header */}
                    <div className="flex items-end justify-between border-b border-white/5 pb-4">
                       <div>
                          <div className="text-[10px] uppercase text-white/30 font-bold mb-1 tracking-wider">{type} Result</div>
                          <div className="text-4xl font-bold text-white tabular-nums">
                             {previewData?.total?.toLocaleString() || 0}
                          </div>
                          <div className="text-xs text-white/40 mt-1">Total events matching query</div>
                       </div>
                    </div>

                    {/* Preview Chart */}
                    <div className={previewLoading ? "opacity-40 grayscale transition-all duration-500" : "transition-all duration-500"}>
                      {type === "trend" && previewData && <TrendChart rows={previewData.rows} />}
                      {type === "breakdown" && previewData && <BreakdownList rows={previewData.rows} />}
                      {type === "funnel" && previewData && <FunnelView rows={previewData.rows} />}
                      {type === "count" && (
                         <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                            <span className="text-sm text-white/50 italic">Count insight shows a single number.</span>
                         </div>
                      )}
                    </div>
                  </div>
                )}
             </div>

             <div className="mt-auto pt-6 border-t border-white/5 text-[10px] text-white/20 flex items-center justify-between">
                <span>Directly querying ClickHouse</span>
                <span>v0.4 Preview</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
