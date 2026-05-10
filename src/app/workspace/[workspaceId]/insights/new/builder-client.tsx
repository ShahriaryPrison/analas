"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { INSIGHT_TYPES, getInsightType } from "@/lib/insight-types";
import { 
  CheckIcon, 
  ChevronRightIcon, 
  ArrowLeftIcon, 
  BarChart2Icon, 
  ActivityIcon,
  ZapIcon
} from "@/components/icons";
import { 
  TrendChart, 
  TrendLineChart,
  MultiTrendChart,
  MultiTrendLineChart,
  BreakdownList, 
  FunnelView, 
  type InsightData 
} from "../insight-card";
import Link from "next/link";

type Props = {
  workspaceId: string;
  topEvents: string[];
};

const MOCK_DATA: Record<string, InsightData> = {
  count: { total: 12450, rows: [] },
  trend: { total: 5420, rows: [
    { day: "Day 1", count: 400 }, { day: "Day 2", count: 700 }, { day: "Day 3", count: 550 },
    { day: "Day 4", count: 900 }, { day: "Day 5", count: 1100 }, { day: "Day 6", count: 850 }, { day: "Day 7", count: 1200 }
  ]},
  multi_trend: { total: 8900, rows: [
    { day: "Day 1", counts: { "Signup": 200, "Login": 500 } },
    { day: "Day 2", counts: { "Signup": 350, "Login": 620 } },
    { day: "Day 3", counts: { "Signup": 280, "Login": 480 } },
    { day: "Day 4", counts: { "Signup": 500, "Login": 750 } },
    { day: "Day 5", counts: { "Signup": 620, "Login": 900 } },
  ]},
  breakdown: { total: 1000, rows: [
    { val: "Chrome", count: 540 }, { val: "Safari", count: 210 }, { val: "Firefox", count: 120 }, { val: "Edge", count: 80 }
  ]},
  funnel: { total: 1000, rows: [
    { label: "Visited Page", count: 1000 }, { label: "Added to Cart", count: 420 }, { label: "Purchased", count: 115 }
  ]}
};

export default function InsightBuilder({ workspaceId, topEvents }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [queryConfig, setQueryConfig] = useState<Record<string, string>>({
    timeFrame: "7",
    displayType: "bar"
  });
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [previewData, setPreviewData] = useState<InsightData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedType = type ? getInsightType(type) : null;
  const isDemo = !previewData;
  const activeData = previewData || (type ? MOCK_DATA[type] : null);

  // Auto-fetch preview
  useEffect(() => {
    if (!type || !selectedType) return;
    
    const timeout = setTimeout(async () => {
      const hasRequired = selectedType.configFields.every(f => queryConfig[f.key]);
      if (!hasRequired) return;

      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/insights/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, queryConfig }),
        });
        if (res.ok) setPreviewData(await res.json());
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [type, queryConfig, workspaceId, selectedType]);

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/workspace/${workspaceId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || `${queryConfig.eventName || "New"} ${selectedType?.label}`, type, queryConfig }),
    });

    if (res.ok) {
      router.push(`/workspace/${workspaceId}/insights`);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/workspace/${workspaceId}/insights`}
            className="p-2 rounded-full hover:bg-white/5 transition text-white/40 hover:text-white"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Insight</h1>
            <p className="text-sm text-white/40">Step {step} of 3</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12 items-start">
        
        <main className="space-y-12">
          {/* STEP 1: SELECT TYPE */}
          <section className={`space-y-6 transition-all duration-500 ${step > 1 ? "opacity-40 grayscale pointer-events-none" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold ring-1 ring-emerald-500/20">1</span>
              <h2 className="text-lg font-semibold text-white">What do you want to measure?</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INSIGHT_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setType(t.id); setStep(2); }}
                  className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 ${
                    type === t.id 
                    ? "bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/40" 
                    : "bg-surface-900 border-white/5 hover:border-white/20"
                  }`}
                >
                  <span className="text-2xl mb-4 block group-hover:scale-110 transition-transform">{t.icon}</span>
                  <h3 className="font-bold text-white mb-1">{t.label}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{t.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* STEP 2: CONFIGURE */}
          {type && (
            <section className={`space-y-6 transition-all duration-500 ${step !== 2 ? "opacity-40 grayscale pointer-events-none" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold ring-1 ring-emerald-500/20">2</span>
                <h2 className="text-lg font-semibold text-white">Which events or properties?</h2>
              </div>

              <div className="glass-panel rounded-2xl p-8 space-y-8">
                {selectedType?.configFields.map(f => (
                  <div key={f.key} className="space-y-3">
                    <label className="text-sm font-medium text-white/70 block">{f.label}</label>
                    {f.options ? (
                      <div className="flex flex-wrap gap-2">
                        {f.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setQueryConfig({ ...queryConfig, [f.key]: opt.value })}
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
                      <div className="space-y-4">
                        <input
                          autoFocus
                          value={queryConfig[f.key] || ""}
                          onChange={(e) => setQueryConfig({ ...queryConfig, [f.key]: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400/40 transition placeholder:text-white/20"
                          placeholder={f.placeholder}
                        />
                        {(f.key === "eventName" || f.key === "eventNames" || f.key === "eventSteps") && (
                          <div className="flex flex-wrap gap-2">
                            {topEvents.map(ev => {
                              const isMulti = f.key === "eventNames" || f.key === "eventSteps";
                              const currentVal = queryConfig[f.key] || "";
                              const vals = currentVal.split(",").map(v => v.trim()).filter(Boolean);
                              const isSelected = isMulti ? vals.includes(ev) : currentVal === ev;
                              
                              return (
                                <button
                                  key={ev}
                                  onClick={() => {
                                    if (isMulti) {
                                      if (isSelected) setQueryConfig({ ...queryConfig, [f.key]: vals.filter(v => v !== ev).join(", ") });
                                      else setQueryConfig({ ...queryConfig, [f.key]: [...vals, ev].join(", ") });
                                    } else {
                                      setQueryConfig({ ...queryConfig, [f.key]: ev });
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                                    isSelected 
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold" 
                                    : "bg-white/5 border-white/5 text-white/40 hover:text-white/60"
                                  }`}
                                >
                                  {ev}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button 
                  onClick={() => setStep(3)}
                  disabled={!selectedType?.configFields.every(f => queryConfig[f.key])}
                  className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-300 transition disabled:opacity-30"
                >
                  Confirm & Preview <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* STEP 3: NAME & SAVE */}
          {step === 3 && (
             <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold ring-1 ring-emerald-500/20">3</span>
                  <h2 className="text-lg font-semibold text-white">Give it a name</h2>
                </div>

                <div className="glass-panel rounded-2xl p-8 space-y-6">
                  <input
                    autoFocus
                    placeholder="e.g. Daily Signups"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400/40 transition"
                  />
                  
                  {error && <p className="text-sm text-rose-400">{error}</p>}

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(2)}
                      className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-[2] py-4 bg-emerald-400 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-300 transition"
                    >
                      {loading ? "Saving..." : "Save to Dashboard"} <CheckIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
             </section>
          )}
        </main>

        <aside className="sticky top-8 space-y-6">
           <div className="glass-panel rounded-3xl p-6 min-h-[450px] flex flex-col border-emerald-500/10 shadow-2xl shadow-emerald-500/5">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isDemo ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                     {isDemo ? "Preview Sample" : "Live Preview"}
                   </span>
                </div>
                {previewLoading && <ActivityIcon className="w-4 h-4 text-emerald-400 animate-pulse" />}
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {activeData ? (
                  <div className="space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="text-center">
                       <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
                         {activeData.total.toLocaleString()}
                       </div>
                       <div className="text-[10px] text-white/30 mt-3 font-semibold uppercase tracking-widest">Total Matches</div>
                    </div>

                    <div className="pt-10 border-t border-white/5">
                      {type === "count" && (
                         <div className="text-center py-8">
                            <ZapIcon className="w-12 h-12 text-emerald-400/20 mx-auto mb-4" />
                            <p className="text-xs text-white/30">Total count will appear here</p>
                         </div>
                      )}
                      {type === "trend" && (
                         queryConfig.displayType === "line" 
                         ? <TrendLineChart rows={activeData.rows} /> 
                         : <TrendChart rows={activeData.rows} />
                      )}
                      {type === "multi_trend" && (
                         queryConfig.displayType === "line" 
                         ? <MultiTrendLineChart rows={activeData.rows} /> 
                         : <MultiTrendChart rows={activeData.rows} />
                      )}
                      {type === "breakdown" && <BreakdownList rows={activeData.rows} />}
                      {type === "funnel" && <FunnelView rows={activeData.rows} />}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-6 opacity-20">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mx-auto">
                      <BarChart2Icon className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-medium">Select a metric to begin</p>
                  </div>
                )}
              </div>
           </div>

           <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-[11px] text-blue-300 leading-relaxed">
                <strong>Pro Tip:</strong> Analas queries your ClickHouse cluster directly, giving you sub-second results even on millions of events.
              </p>
           </div>
        </aside>

      </div>
    </div>
  );
}
