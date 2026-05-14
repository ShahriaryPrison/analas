"use client";

import { useEffect, useState } from "react";
import { getInsightType } from "@/lib/insight-types";
import { BarChart2Icon, ActivityIcon } from "@/components/icons";
import DeleteInsightButton from "./delete-insight-button";

export type Row = { day?: string; count?: number; label?: string; val?: string; counts?: Record<string, number> };
export type InsightData = { total: number; rows: Row[] };

type Props = {
  workspaceId: string;
  insight: {
    id: string;
    name: string;
    type: string;
    queryConfig: Record<string, unknown>;
  };
};

export default function InsightCard({ workspaceId, insight }: Props) {
  const [data, setData] = useState<InsightData | null>(null);
  const [error, setError] = useState(false);
  const typeDef = getInsightType(insight.type);

  useEffect(() => {
    fetch(`/api/workspace/${workspaceId}/insights/${insight.id}/data`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [workspaceId, insight.id]);

  return (
    <article className="glass-panel rounded-3xl p-6 h-full flex flex-col space-y-6 group transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[10px] font-black text-white/40 group-hover:text-emerald-400 transition-colors">
              {typeDef.icon}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
              {typeDef.label}
            </span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight truncate leading-tight">
            {insight.name}
          </h3>
          <p className="text-[11px] text-white/30 font-medium mt-1 uppercase tracking-wider">
            {Object.values(insight.queryConfig).filter(v => typeof v === 'string').join(" • ")}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
           {data ? (
            <div className="text-right">
               <div className="text-2xl font-black text-white tracking-tighter tabular-nums leading-none">
                 {data.total.toLocaleString()}
               </div>
               <div className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest mt-1">
                 Total
               </div>
            </div>
          ) : (
            <div className="h-8 w-16 animate-pulse rounded-lg bg-white/5" />
          )}
          <DeleteInsightButton workspaceId={workspaceId} insightId={insight.id} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[160px] flex flex-col justify-end">
      {/* Multi-Trend (Comparison) */}
      {insight.type === "multi_trend" && (
        <div className="space-y-4">
          {error ? (
            <p className="text-sm text-red-400/70">Could not load data.</p>
          ) : !data ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-32 w-full animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : (
            insight.queryConfig.displayType === "line" ? (
              <MultiTrendLineChart rows={data.rows} />
            ) : (
              <MultiTrendChart rows={data.rows} />
            )
          )}
        </div>
      )}

      {/* Trend */}
      {insight.type === "trend" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <ActivityIcon className="w-3 h-3" />
            Last 7 days
          </div>
          {error ? (
            <p className="text-sm text-red-400/70">Could not load data.</p>
          ) : !data ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-32 w-full animate-pulse rounded-lg bg-white/5" />
                  <div className="h-3 w-8 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : data.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/50">
              No data yet.
            </div>
          ) : (
            insight.queryConfig.displayType === "line" ? (
              <TrendLineChart rows={data.rows} />
            ) : (
              <TrendChart rows={data.rows} />
            )
          )}
        </div>
      )}

      {/* Breakdown */}
      {insight.type === "breakdown" && (
        <div className="space-y-2">
          {error ? (
            <p className="text-sm text-red-400/70">Could not load data.</p>
          ) : !data ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : data.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/50">
              No data for this property.
            </div>
          ) : (
            <BreakdownList rows={data.rows} />
          )}
        </div>
      )}

      {/* Funnel */}
      {insight.type === "funnel" && (
        <div className="space-y-4">
          {error ? (
            <p className="text-sm text-red-400/70">Could not load data.</p>
          ) : !data ? (
            <div className="space-y-4">
              <div className="h-12 w-full animate-pulse rounded-lg bg-white/5" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-white/5" />
            </div>
          ) : (
            <FunnelView rows={data.rows} />
          )}
        </div>
      )}

      {/* Metric (Advanced Aggregations) */}
      {insight.type === "metric" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <ActivityIcon className="w-3 h-3" />
            Last {insight.queryConfig.timeFrame || "7"} days
          </div>
          {error ? (
            <p className="text-sm text-red-400/70">Could not load metric data.</p>
          ) : !data ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-32 w-full animate-pulse rounded-lg bg-white/5" />
                  <div className="h-3 w-8 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : data.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/50">
              No data yet.
            </div>
          ) : (
            insight.queryConfig.displayType === "line" ? (
              <TrendLineChart rows={data.rows} />
            ) : (
              <TrendChart rows={data.rows} />
            )
          )}
        </div>
      )}

      {insight.type === "count" && error && (
        <p className="text-sm text-red-400/70">Could not load data.</p>
      )}
      </div>
    </article>
  );
}

export function TrendChart({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map((r) => r.count || 0), 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {rows.map((row, i) => (
        <div key={row.day || i} className="flex flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end rounded-lg border border-white/10 bg-white/5 p-2">
            <div
              className="w-full rounded-md bg-emerald-400 transition-all duration-500"
              style={{ height: `${((row.count || 0) / max) * 100}%`, minHeight: (row.count || 0) > 0 ? "4px" : "0" }}
            />
          </div>
          <div className="text-[11px] text-white/50">{(row.day || "").slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

const PALETTE = ["bg-emerald-400", "bg-indigo-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400"];

export function MultiTrendChart({ rows }: { rows: any[] }) {
  const events = Object.keys(rows[0]?.counts || {});
  const max = Math.max(...rows.flatMap(r => Object.values(r.counts as Record<string, number>)), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-1">
        {rows.map((dayRow, i) => (
          <div key={dayRow.day || i} className="flex flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center gap-0.5 rounded-lg border border-white/5 bg-white/2 p-1">
              {events.map((ev, ei) => {
                const count = dayRow.counts[ev] || 0;
                return (
                  <div
                    key={ev}
                    title={`${ev}: ${count}`}
                    className={`w-full rounded-sm transition-all duration-500 ${PALETTE[ei % PALETTE.length]}`}
                    style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? "2px" : "0" }}
                  />
                );
              })}
            </div>
            <div className="text-[10px] text-white/30">{(dayRow.day || "").slice(8)}</div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-white/5">
         {events.map((ev, i) => (
           <div key={ev} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${PALETTE[i % PALETTE.length]}`} />
              <span className="text-[11px] font-medium text-white/60">{ev}</span>
           </div>
         ))}
      </div>
    </div>
  );
}

export function BreakdownList({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map((r) => r.count || 0), 1);
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.val} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span className="truncate pr-4">{row.val || "(empty)"}</span>
            <span className="tabular-nums font-medium text-white">{(row.count || 0).toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-cyan-400/60 transition-all duration-500"
              style={{ width: `${((row.count || 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FunnelView({ rows }: { rows: Row[] }) {
  const firstCount = rows[0]?.count || 1;
  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={row.label} className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-white/60">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-white">{row.label}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{(row.count || 0).toLocaleString()}</div>
              {i > 0 && (
                <div className="text-[10px] text-emerald-400 font-medium">
                  {(((row.count || 0) / firstCount) * 100).toFixed(1)}% conversion
                </div>
              )}
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-emerald-400/80 transition-all duration-700"
              style={{ width: `${((row.count || 0) / firstCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export function TrendLineChart({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map((r) => r.count || 0), 1);
  const width = 700;
  const height = 120;
  
  const points = rows.map((r, i) => {
    const x = (i / (rows.length - 1)) * width;
    const y = height - ((r.count || 0) / max) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full h-32 flex items-center justify-center">
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <polyline
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="transition-all duration-700"
          />
       </svg>
    </div>
  );
}

export function MultiTrendLineChart({ rows }: { rows: any[] }) {
  const events = Object.keys(rows[0]?.counts || {});
  const max = Math.max(...rows.flatMap(r => Object.values(r.counts as Record<string, number>)), 1);
  const width = 700;
  const height = 120;

  return (
    <div className="space-y-6">
      <div className="w-full h-32">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
           {events.map((ev, i) => {
              const points = rows.map((r, ri) => {
                const x = (ri / (rows.length - 1)) * width;
                const count = r.counts[ev] || 0;
                const y = height - (count / max) * height;
                return `${x},${y}`;
              }).join(" ");

              const colorMap: Record<string, string> = {
                "bg-emerald-400": "#34d399",
                "bg-indigo-400": "#818cf8",
                "bg-amber-400": "#fbbf24",
                "bg-rose-400": "#fb7185",
                "bg-cyan-400": "#22d3ee"
              };

              return (
                <polyline
                  key={ev}
                  fill="none"
                  stroke={colorMap[PALETTE[i % PALETTE.length]] || "#34d399"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                  className="transition-all duration-700"
                />
              );
           })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-white/5">
         {events.map((ev, i) => (
           <div key={ev} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${PALETTE[i % PALETTE.length]}`} />
              <span className="text-[11px] font-medium text-white/60">{ev}</span>
           </div>
         ))}
      </div>
    </div>
  );
}
