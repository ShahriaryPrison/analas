"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { INSIGHT_TYPES, getInsightType } from "@/lib/insight-types";
import { hasFeature } from "@/lib/billing/plans";
import InsightDocsViewer from "../insight-docs-viewer";
import { 
  CheckIcon, 
  ChevronRightIcon, 
  ArrowLeftIcon, 
  BarChart2Icon, 
  ActivityIcon,
  ZapIcon,
  PlusIcon
} from "@/components/icons";
import { 
  TrendChart, 
  TrendLineChart,
  MultiTrendChart,
  MultiTrendLineChart,
  BreakdownList, 
  FunnelView, 
  RetentionTable,
  type InsightData 
} from "../insight-card";
import Link from "next/link";

type Props = {
  workspaceId: string;
  topEvents: string[];
  plan: any; // Using any to avoid importing prisma client into client boundary
  dashboardId?: string | null;
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
  ]},
  retention: { total: 3150, returning: 1250, rows: [
    { cohort: "2026-05-12", size: 350, days: [350, 180, 120, 90, 70, 60, 50, 45] },
    { cohort: "2026-05-13", size: 500, days: [500, 300, 200, 150, 120, 90, 80, 0] },
    { cohort: "2026-05-14", size: 450, days: [450, 250, 180, 130, 110, 80, 0, 0] },
    { cohort: "2026-05-15", size: 600, days: [600, 350, 250, 190, 150, 0, 0, 0] },
    { cohort: "2026-05-16", size: 550, days: [550, 300, 220, 170, 0, 0, 0, 0] },
    { cohort: "2026-05-17", size: 400, days: [400, 210, 150, 0, 0, 0, 0, 0] },
    { cohort: "2026-05-18", size: 300, days: [300, 160, 0, 0, 0, 0, 0, 0] }
  ]},
  metric: { total: 342, rows: [
    { day: "Day 1", count: 210 }, { day: "Day 2", count: 280 }, { day: "Day 3", count: 195 },
    { day: "Day 4", count: 420 }, { day: "Day 5", count: 380 }, { day: "Day 6", count: 310 }, { day: "Day 7", count: 342 }
  ]}
};

export default function InsightBuilder({ workspaceId, topEvents, plan, dashboardId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [queryConfig, setQueryConfig] = useState<Record<string, string>>({
    timeFrame: "7",
    displayType: "bar",
    aggregation: "uniq",
  });
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rightPanelTab, setRightPanelTab] = useState<"preview" | "docs">("preview");

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
      body: JSON.stringify({
        name: name || `${queryConfig.eventName || "New"} ${selectedType?.label}`,
        type,
        queryConfig,
        dashboardId,
      }),
    });

    if (res.ok) {
      const redirectUrl = dashboardId
        ? `/workspace/${workspaceId}/insights?dashboardId=${dashboardId}`
        : `/workspace/${workspaceId}/insights`;
      router.push(redirectUrl);
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
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-1 transition-all ${
                  step > 1 ? "bg-emerald-500 text-slate-900 ring-emerald-500" : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                }`}>
                  {step > 1 ? <CheckIcon className="w-4 h-4" /> : "1"}
                </span>
                <h2 className="text-lg font-semibold text-white">Select a metric</h2>
              </div>
              {step > 1 && (
                <button 
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition uppercase tracking-widest"
                >
                  Change
                </button>
              )}
            </div>
            
            {step === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-500">
                {INSIGHT_TYPES.map(t => {
                  let requiredFeature: any = "basic_insights";
                  if (t.id === "retention") requiredFeature = "cohort_retention";
                  if (t.id === "funnel") requiredFeature = "funnels";
                  if (t.id === "metric") requiredFeature = "advanced_filters";
                  
                  const isLocked = !hasFeature(plan, requiredFeature);

                  return (
                    <button
                      key={t.id}
                      onClick={() => { 
                        if (!isLocked) {
                          setType(t.id); setStep(2); 
                        }
                      }}
                      className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 ${
                        isLocked ? "opacity-50 grayscale bg-white/5 border-white/5 cursor-not-allowed" :
                        type === t.id 
                        ? "bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/40" 
                        : "bg-surface-900 border-white/5 hover:border-white/20"
                      }`}
                    >
                      {isLocked && (
                        <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-amber-500/20">
                          PRO
                        </div>
                      )}
                      <span className="text-2xl mb-4 block group-hover:scale-110 transition-transform">{t.icon}</span>
                      <h3 className="font-bold text-white mb-1">{t.label}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel p-4 rounded-xl flex items-center gap-4 border-emerald-500/20">
                 <span className="text-xl">{selectedType?.icon}</span>
                 <div>
                    <div className="text-sm font-bold text-white">{selectedType?.label}</div>
                    <div className="text-[10px] text-white/30 uppercase font-black tracking-widest">Metric Type</div>
                 </div>
              </div>
            )}
          </section>

          {/* STEP 2: CONFIGURE */}
          {type && (
            <section className={`space-y-6 transition-all duration-500 ${step < 2 ? "opacity-20 pointer-events-none translate-y-4" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-1 transition-all ${
                    step > 2 ? "bg-emerald-500 text-slate-900 ring-emerald-500" : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                  }`}>
                    {step > 2 ? <CheckIcon className="w-4 h-4" /> : "2"}
                  </span>
                  <h2 className="text-lg font-semibold text-white">Configure measurement</h2>
                </div>
                {step > 2 && (
                  <button 
                    onClick={() => setStep(2)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition uppercase tracking-widest"
                  >
                    Modify
                  </button>
                )}
              </div>

              {step >= 2 && (
                <div className={`glass-panel rounded-2xl p-8 space-y-8 animate-in slide-in-from-top-4 duration-500 ${step > 2 ? "opacity-40 grayscale pointer-events-none" : ""}`}>
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
                        <div className="space-y-4 relative group/field">
                          <div className="relative">
                            <input
                              value={queryConfig[f.key] || ""}
                              onChange={(e) => setQueryConfig({ ...queryConfig, [f.key]: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400/40 transition placeholder:text-white/20 pr-10"
                              placeholder={f.placeholder}
                            />
                            {(f.key === "eventName" || f.key === "eventNames" || f.key === "eventSteps" || f.key === "startEvent" || f.key === "returnEvent") && (
                              <ActivityIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within/field:text-emerald-400 transition" />
                            )}
                          </div>
                          
                          {/* Searchable Discovery Panel */}
                          {(f.key === "eventName" || f.key === "eventNames" || f.key === "eventSteps" || f.key === "startEvent" || f.key === "returnEvent") && (
                            <div className="space-y-3">
                              <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Suggested Events</div>
                              <div className="flex flex-wrap gap-2">
                                {topEvents
                                  .filter(ev => {
                                    const isMulti = f.key === "eventNames" || f.key === "eventSteps";
                                    const currentVal = queryConfig[f.key] || "";
                                    let searchPart = isMulti ? currentVal.split(",").pop()?.trim() || "" : currentVal;
                                    
                                    if (isMulti && searchPart) {
                                      const vals = currentVal.split(",").map(v => v.trim()).filter(Boolean);
                                      if (vals.includes(searchPart)) {
                                        searchPart = ""; // Reset search if the last part is already a selected value
                                      }
                                    }
                                    
                                    return !searchPart || ev.toLowerCase().includes(searchPart.toLowerCase());
                                  })
                                  .slice(0, 12)
                                  .map(ev => {
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
                                        className={`px-3 py-1.5 rounded-lg text-xs border transition flex items-center gap-2 ${
                                          isSelected 
                                          ? "bg-emerald-500 text-slate-900 border-emerald-500 font-bold" 
                                          : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                        }`}
                                      >
                                        {ev}
                                        {!isSelected && <PlusIcon className="w-3 h-3 opacity-30" />}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {f.key === "distinctId" && (
                            <div className="space-y-3">
                              <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Common Identities</div>
                              <div className="flex flex-wrap gap-2">
                                {["user_id", "session_id"].map(idStr => {
                                  const isSelected = queryConfig[f.key] === idStr;
                                  return (
                                    <button
                                      key={idStr}
                                      onClick={() => setQueryConfig({ ...queryConfig, [f.key]: idStr })}
                                      className={`px-3 py-1.5 rounded-lg text-xs border transition flex items-center gap-2 ${
                                        isSelected 
                                        ? "bg-emerald-500 text-slate-900 border-emerald-500 font-bold" 
                                        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                      }`}
                                    >
                                      {idStr}
                                    </button>
                                  );
                                })}
                              </div>
                              {type === "retention" && (
                                <div className="text-xs text-white/40 leading-relaxed bg-white/5 border border-white/5 rounded-lg p-3">
                                  <strong>How Identity Works:</strong> Analas uses the chosen identity property (like <code className="text-emerald-400/80">session_id</code>) to track the exact same individual across both the Start Event and the Return Event automatically. No custom tracking code required!
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 bg-white/5 border border-white/10 text-white/40 rounded-xl font-bold hover:bg-white/10 hover:text-white transition"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setStep(3)}
                      disabled={!selectedType?.configFields.every(f => queryConfig[f.key])}
                      className="flex-[2] py-4 bg-white text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-300 transition disabled:opacity-30"
                    >
                      Continue <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
                <div className="flex gap-1.5">
                   <button
                     type="button"
                     onClick={() => setRightPanelTab("preview")}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                       rightPanelTab === "preview" 
                         ? "bg-white/10 text-white" 
                         : "text-white/40 hover:text-white/85 hover:bg-white/5"
                     }`}
                   >
                     Live Preview
                   </button>
                   {selectedType && (
                     <button
                       type="button"
                       onClick={() => setRightPanelTab("docs")}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                         rightPanelTab === "docs" 
                           ? "bg-white/10 text-white animate-pulse" 
                           : "text-white/40 hover:text-white/85 hover:bg-white/5"
                       }`}
                     >
                       📖 Guide & Docs
                     </button>
                   )}
                </div>
                {rightPanelTab === "preview" && (
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${isDemo ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                       {isDemo ? "Preview Sample" : "Live Preview"}
                     </span>
                  </div>
                )}
                {rightPanelTab === "preview" && previewLoading && <ActivityIcon className="w-4 h-4 text-emerald-400 animate-pulse" />}
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {rightPanelTab === "docs" && selectedType ? (
                  <div className="overflow-y-auto max-h-[480px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <InsightDocsViewer typeDef={selectedType} />
                  </div>
                ) : activeData ? (
                  <div className="space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="text-center">
                       <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
                         {activeData.total.toLocaleString()}
                       </div>
                       <div className="text-[10px] text-white/30 mt-3 font-semibold uppercase tracking-widest">
                          {type === "metric"
                            ? ({ uniq: "Unique Count", avg: "Average", p50: "Median (P50)", p95: "95th Percentile (P95)" } as Record<string,string>)[queryConfig.aggregation] ?? "Aggregate Value"
                            : "Total Matches"}
                       </div>
                    </div>

                    <div className="pt-10 border-t border-white/5">
                      {type === "count" && (
                         <div className="text-center py-8">
                            <ZapIcon className="w-12 h-12 text-emerald-400/20 mx-auto mb-4" />
                            <p className="text-xs text-white/30">Total count will appear here</p>
                         </div>
                      )}
                      {(type === "trend" || type === "metric") && (
                         queryConfig.displayType === "number" ? (
                           <div className="text-center py-6">
                             <ZapIcon className="w-8 h-8 text-emerald-400/20 mx-auto mb-3" />
                             <p className="text-xs text-white/30">Single number displayed above</p>
                           </div>
                         ) : queryConfig.displayType === "line" ? (
                           <TrendLineChart rows={activeData.rows} />
                         ) : (
                           <TrendChart rows={activeData.rows} />
                         )
                      )}
                      {type === "multi_trend" && (
                         queryConfig.displayType === "line" 
                         ? <MultiTrendLineChart rows={activeData.rows} /> 
                         : <MultiTrendChart rows={activeData.rows} />
                      )}
                      {type === "breakdown" && <BreakdownList rows={activeData.rows} />}
                      {type === "funnel" && <FunnelView rows={activeData.rows} />}
                      {type === "retention" && (
                         <div className="flex flex-col lg:flex-row gap-6">
                           <div className="flex-1 min-w-0">
                             <RetentionTable rows={activeData.rows} timeFrame={7} />
                           </div>
                           <div className="flex flex-col gap-4 w-full lg:w-48 shrink-0 justify-end pb-2">
                              <div className="glass-panel p-4 rounded-xl text-center bg-white/5 border-emerald-500/10 flex flex-col justify-center h-full">
                                  <div className="text-2xl font-black text-white">{activeData.total.toLocaleString()}</div>
                                  <div className="text-[9px] font-bold tracking-widest text-white/40 uppercase mt-2">All-Time Users</div>
                              </div>
                              <div className="glass-panel p-4 rounded-xl text-center bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-center h-full">
                                  <div className="text-2xl font-black text-emerald-400">
                                     {activeData.returning ? ((activeData.returning / activeData.total) * 100).toFixed(1) : 0}%
                                  </div>
                                  <div className="text-[9px] font-bold tracking-widest text-emerald-400/60 uppercase mt-2">All-Time Return Rate</div>
                              </div>
                           </div>
                         </div>
                      )}
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
