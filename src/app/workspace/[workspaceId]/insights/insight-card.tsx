"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInsightType } from "@/lib/insight-types";
import { BarChart2Icon, ActivityIcon, TrashIcon } from "@/components/icons";
import MoveInsightButton from "./move-insight-button";
import InsightDocsViewer from "./insight-docs-viewer";

export type Row = { day?: string; count?: number; label?: string; val?: string; counts?: Record<string, number>; cohort?: string; size?: number; days?: number[] };
export type InsightData = { total: number; returning?: number; rows: Row[] };

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const router = useRouter();
  const eventLabels = (insight.queryConfig as any)?.eventLabels as Record<string, string> | undefined;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/insights/${insight.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    fetch(`/api/workspace/${workspaceId}/insights/${insight.id}/data`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [workspaceId, insight.id]);

  return (
    <article className="glass-panel rounded-3xl p-4 sm:p-6 h-full flex flex-col space-y-4 sm:space-y-6 group transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
        <div className="min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[10px] font-black text-white/40 group-hover:text-emerald-400 transition-colors">
              {typeDef.icon}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
              {typeDef.label}
            </span>
            <button
              onClick={() => setShowDocs(!showDocs)}
              title="Show documentation"
              className={`p-0.5 rounded transition ${
                showDocs 
                  ? "text-emerald-400 bg-emerald-500/10" 
                  : "text-white/30 hover:text-emerald-400 hover:bg-white/5"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
              </svg>
            </button>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight truncate leading-tight">
            {insight.name}
          </h3>
          <p className="text-[11px] text-white/30 font-medium mt-1 uppercase tracking-wider">
            {Object.values(insight.queryConfig).filter(v => typeof v === 'string').join(" • ")}
          </p>
        </div>
        
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-4 sm:gap-2 shrink-0 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
           {data ? (
            <div className="text-left sm:text-right">
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

          {confirmDelete ? (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1 z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded px-2 py-0.5 text-[10px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition disabled:opacity-50"
              >
                {deleting ? "..." : "Yes"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded px-2 py-0.5 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/5 transition"
              >
                No
              </button>
            </div>
          ) : (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden divide-x divide-white/10">
              <MoveInsightButton workspaceId={workspaceId} insightId={insight.id} direction="up" />
              <MoveInsightButton workspaceId={workspaceId} insightId={insight.id} direction="down" />
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete insight"
                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[160px] flex flex-col justify-end">
      {showDocs ? (
        <div className="flex-1 flex flex-col justify-between space-y-3 h-full pt-2">
          <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <InsightDocsViewer typeDef={typeDef} />
          </div>
          <button
            onClick={() => setShowDocs(false)}
            className="w-full py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition"
          >
            ← Back to Chart
          </button>
        </div>
      ) : (
        <>
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
              <MultiTrendLineChart rows={data.rows} labels={eventLabels} />
            ) : (
              <MultiTrendChart rows={data.rows} labels={eventLabels} />
            )
          )}
        </div>
      )}

      {/* Trend */}
      {insight.type === "trend" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <ActivityIcon className="w-3 h-3" />
            Last {String(insight.queryConfig.timeFrame || "7")} days
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
            <FunnelView rows={data.rows} labels={eventLabels} />
          )}
        </div>
      )}

      {/* Retention */}
      {insight.type === "retention" && (
        <div className="space-y-4">
          {error ? (
            <p className="text-sm text-red-400/70">Could not load data.</p>
          ) : !data ? (
             <div className="w-full h-32 animate-pulse rounded-lg bg-white/5" />
          ) : (
             <div className="flex flex-col lg:flex-row gap-6">
               {/* Left: The Cohort Table */}
               <div className="flex-1 min-w-0">
                 <RetentionTable rows={data.rows} timeFrame={7} />
               </div>
               
               {/* Right: All-Time Stats Sidebar */}
               <div className="grid grid-cols-2 lg:flex lg:flex-col gap-4 w-full lg:w-48 shrink-0 justify-end pb-2">
                  <div className="glass-panel p-4 rounded-xl text-center bg-white/5 border-emerald-500/10 flex flex-col justify-center h-full">
                      <div className="text-2xl font-black text-white">{data.total.toLocaleString()}</div>
                      <div className="text-[9px] font-bold tracking-widest text-white/40 uppercase mt-2">All-Time Users</div>
                  </div>
                  <div className="glass-panel p-4 rounded-xl text-center bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-center h-full">
                      <div className="text-2xl font-black text-emerald-400">
                         {data.returning ? ((data.returning / data.total) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-[9px] font-bold tracking-widest text-emerald-400/60 uppercase mt-2">All-Time Return Rate</div>
                  </div>
               </div>
             </div>
          )}
        </div>
      )}

      {/* Metric (Advanced Aggregations) */}
      {insight.type === "metric" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <ActivityIcon className="w-3 h-3" />
            Last {String(insight.queryConfig.timeFrame || "7")} days
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
          ) : insight.queryConfig.displayType === "number" ? (
             <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-center text-white/50">
                Number displayed above
             </div>
          ) : insight.queryConfig.displayType === "line" ? (
            <TrendLineChart rows={data.rows} />
          ) : (
            <TrendChart rows={data.rows} />
          )}
        </div>
      )}

      {insight.type === "count" && error && (
        <p className="text-sm text-red-400/70">Could not load data.</p>
      )}
        </>
      )}
      </div>
    </article>
  );
}

export function TrendChart({ rows }: { rows: Row[] }) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.count || 0), 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {rows.map((row, i) => (
        <div
          key={row.day || i}
          className="relative flex flex-col items-center gap-2"
          onMouseEnter={() => setHoveredBar(i)}
          onMouseLeave={() => setHoveredBar(null)}
        >
          {/* Tooltip */}
          {hoveredBar === i && (
            <div className="absolute -top-2 -translate-y-full left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-semibold text-white bg-zinc-900/90 border border-white/10 rounded-lg shadow-xl whitespace-nowrap z-20 backdrop-blur-sm pointer-events-none">
              {row.count?.toLocaleString()}
            </div>
          )}
          <div className="flex h-32 w-full items-end rounded-lg border border-white/10 bg-white/5 p-2">
            <div
              className="w-full rounded-md bg-emerald-400 transition-all duration-500"
              style={{ height: `${((row.count || 0) / max) * 100}%`, minHeight: (row.count || 0) > 0 ? "4px" : "0" }}
            />
          </div>
          <div className="text-[11px] text-white/50 font-medium">
            <span className="hidden sm:inline">{(row.day || "").slice(5)}</span>
            <span className="inline sm:hidden">{(row.day || "").slice(8)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const PALETTE = ["bg-emerald-400", "bg-indigo-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400"];

export function MultiTrendChart({ rows, labels }: { rows: any[]; labels?: Record<string, string> }) {
  const [hoveredSegment, setHoveredSegment] = useState<{ dayIdx: number; ev: string } | null>(null);
  const events = Object.keys(rows[0]?.counts || {});
  const max = Math.max(...rows.flatMap(r => Object.values(r.counts as Record<string, number>)), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-1">
        {rows.map((dayRow, i) => (
          <div
            key={dayRow.day || i}
            className="relative flex flex-col items-center gap-2"
          >
            {/* Tooltip for segment */}
            {hoveredSegment && hoveredSegment.dayIdx === i && (
              <div className="absolute -top-2 -translate-y-full left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-semibold text-white bg-zinc-900/90 border border-white/10 rounded-lg shadow-xl whitespace-nowrap z-20 backdrop-blur-sm pointer-events-none">
                {labels?.[hoveredSegment.ev] || hoveredSegment.ev}: {dayRow.counts[hoveredSegment.ev]?.toLocaleString()}
              </div>
            )}
            <div className="flex h-32 w-full items-end justify-center gap-0.5 rounded-lg border border-white/5 bg-white/2 p-1">
              {events.map((ev, ei) => {
                const count = dayRow.counts[ev] || 0;
                return (
                  <div
                    key={ev}
                    onMouseEnter={() => setHoveredSegment({ dayIdx: i, ev })}
                    onMouseLeave={() => setHoveredSegment(null)}
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
              <span className="text-[11px] font-medium text-white/60">{labels?.[ev] || ev}</span>
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

export function FunnelView({ rows, labels }: { rows: Row[]; labels?: Record<string, string> }) {
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
              <span className="text-sm font-medium text-white">{labels?.[row.label || ""] || row.label}</span>
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
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.count || 0), 1);
  const width = 700;
  const height = 120;
  
  const pointCoords = rows.map((r, i) => ({
    x: (i / Math.max(rows.length - 1, 1)) * width,
    y: height - ((r.count || 0) / max) * height,
    count: r.count || 0,
  }));

  const pointsStr = pointCoords.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="relative w-full h-32">
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <polyline
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsStr}
            className="transition-all duration-700"
          />
          {/* Visible dot on hovered point */}
          {hoveredPoint !== null && (
            <circle
              cx={pointCoords[hoveredPoint].x}
              cy={pointCoords[hoveredPoint].y}
              r={5}
              fill="#34d399"
              stroke="#fff"
              strokeWidth={1.5}
            />
          )}
          {/* Invisible wide hit areas per point */}
          {pointCoords.map((p, idx) => (
            <rect
              key={idx}
              x={p.x - width / rows.length / 2}
              y={0}
              width={width / rows.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredPoint(idx)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
       </svg>
       {/* Tooltip positioned above the hovered data point */}
       {hoveredPoint !== null && (
         <div
           className="absolute -top-2 -translate-y-full -translate-x-1/2 px-2 py-1 text-xs font-semibold text-white bg-zinc-900/90 border border-white/10 rounded-lg shadow-xl whitespace-nowrap z-20 backdrop-blur-sm pointer-events-none"
           style={{ left: `${(pointCoords[hoveredPoint].x / width) * 100}%` }}
         >
           {rows[hoveredPoint].count?.toLocaleString()}
         </div>
       )}
    </div>
  );
}

export function MultiTrendLineChart({ rows, labels }: { rows: any[]; labels?: Record<string, string> }) {
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const events = Object.keys(rows[0]?.counts || {});
  const max = Math.max(...rows.flatMap(r => Object.values(r.counts as Record<string, number>)), 1);
  const width = 700;
  const height = 120;

  return (
    <div className="space-y-6">
      <div className="relative w-full h-32">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
           {events.map((ev, i) => {
              const points = rows.map((r, ri) => {
                const x = (ri / Math.max(rows.length - 1, 1)) * width;
                const count = r.counts[ev] || 0;
                const y = height - (count / max) * height;
                return { x, y, count };
              });

              const colorMap: Record<string, string> = {
                "bg-emerald-400": "#34d399",
                "bg-indigo-400": "#818cf8",
                "bg-amber-400": "#fbbf24",
                "bg-rose-400": "#fb7185",
                "bg-cyan-400": "#22d3ee"
              };

              const strokeColor = colorMap[PALETTE[i % PALETTE.length]] || "#34d399";

              return (
                <g key={ev}>
                  <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points.map(p => `${p.x},${p.y}`).join(" ")}
                    className="transition-all duration-700"
                  />
                  {/* Visible dot on hovered point for this line */}
                  {hoveredPointIdx !== null && (
                    <circle
                      cx={points[hoveredPointIdx].x}
                      cy={points[hoveredPointIdx].y}
                      r={5}
                      fill={strokeColor}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
           })}
           {/* Invisible column hit areas rendered on top */}
           {rows.map((_, idx) => (
             <rect
               key={idx}
               x={(idx / Math.max(rows.length - 1, 1)) * width - width / rows.length / 2}
               y={0}
               width={width / rows.length}
               height={height}
               fill="transparent"
               onMouseEnter={() => setHoveredPointIdx(idx)}
               onMouseLeave={() => setHoveredPointIdx(null)}
             />
           ))}
        </svg>
        {/* Tooltip positioned above the hovered column */}
        {hoveredPointIdx !== null && (() => {
          const xPct = (hoveredPointIdx / Math.max(rows.length - 1, 1)) / 1 * 100;
          const dayRow = rows[hoveredPointIdx];
          return (
            <div
              className="absolute -top-2 -translate-y-full -translate-x-1/2 px-2 py-1.5 text-[11px] font-semibold text-white bg-zinc-900/95 border border-white/10 rounded-lg shadow-xl z-20 backdrop-blur-sm pointer-events-none flex flex-col gap-0.5 min-w-[120px]"
              style={{ left: `${xPct}%` }}
            >
              <div className="text-[9px] text-white/40 border-b border-white/5 pb-0.5 mb-0.5">
                {(dayRow?.day || "").slice(5)}
              </div>
              {events.map((ev, i) => {
                const colorMap: Record<string, string> = {
                  "bg-emerald-400": "text-emerald-400",
                  "bg-indigo-400": "text-indigo-400",
                  "bg-amber-400": "text-amber-400",
                  "bg-rose-400": "text-rose-400",
                  "bg-cyan-400": "text-cyan-400"
                };
                const textColor = colorMap[PALETTE[i % PALETTE.length]] || "text-emerald-400";
                return (
                  <div key={ev} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-white/60 truncate max-w-[100px]">{labels?.[ev] || ev}</span>
                    <span className={`font-bold ${textColor}`}>{(dayRow?.counts[ev] || 0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-white/5">
         {events.map((ev, i) => (
           <div key={ev} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${PALETTE[i % PALETTE.length]}`} />
              <span className="text-[11px] font-medium text-white/60">{labels?.[ev] || ev}</span>
           </div>
         ))}
      </div>
    </div>
  );
}

export function RetentionTable({ rows, timeFrame }: { rows: Row[], timeFrame: number }) {
  // Determine if a cell is in the future based on cohort date and day index
  const isFuture = (cohortStr: string, dayIdx: number) => {
    if (!cohortStr) return true;
    const cohortDate = new Date(cohortStr);
    const targetDate = new Date(cohortDate);
    targetDate.setDate(cohortDate.getDate() + dayIdx);
    
    // Compare with today's date (ignoring time)
    const today = new Date();
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);
    return targetDate > today;
  };

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <div className="min-w-[500px]">
        {/* Header Row */}
        <div className="flex gap-1 mb-1">
          <div className="w-24 shrink-0 text-[10px] font-bold text-white/40 uppercase tracking-wider px-2 py-1">
            Cohort
          </div>
          <div className="w-16 shrink-0 text-[10px] font-bold text-white/40 uppercase tracking-wider px-2 py-1 text-right">
            Users
          </div>
          {Array.from({ length: timeFrame }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[40px] text-[10px] font-bold text-white/40 uppercase tracking-wider text-center py-1">
              D{i + 1}
            </div>
          ))}
        </div>

        {/* Data Rows */}
        <div className="flex flex-col gap-1">
          {rows.map((row, i) => {
            const size = row.size || 0;
            const days = row.days || [];
            
            return (
              <div key={row.cohort || i} className="flex gap-1">
                {/* Cohort Date */}
                <div className="w-24 shrink-0 text-xs font-medium text-white/80 px-2 py-1.5 bg-white/5 rounded flex items-center">
                  {(row.cohort || "").slice(5)}
                </div>
                {/* Cohort Size */}
                <div className="w-16 shrink-0 text-xs font-bold text-white px-2 py-1.5 bg-white/5 rounded flex items-center justify-end tabular-nums">
                  {size.toLocaleString()}
                </div>
                {/* Retention Cells */}
                {Array.from({ length: timeFrame }).map((_, dayIdx) => {
                  const val = days[dayIdx + 1] || 0;
                  const pct = size > 0 ? (val / size) * 100 : 0;
                  
                  if (isFuture(row.cohort || "", dayIdx + 1)) {
                    return (
                      <div key={dayIdx} className="flex-1 min-w-[40px] bg-white/2 rounded" />
                    );
                  }

                  let bgClass = "bg-emerald-400/5 text-emerald-400/40";
                  if (pct >= 80) bgClass = "bg-emerald-400/80 text-emerald-950 font-bold";
                  else if (pct >= 50) bgClass = "bg-emerald-400/50 text-emerald-950 font-bold";
                  else if (pct >= 20) bgClass = "bg-emerald-400/30 text-white/90";
                  else if (pct > 0) bgClass = "bg-emerald-400/15 text-emerald-400/70";

                  return (
                    <div 
                      key={dayIdx} 
                      className={`flex-1 min-w-[40px] flex items-center justify-center text-[10px] tabular-nums rounded transition-colors ${bgClass}`}
                      title={`${val.toLocaleString()} users (${pct.toFixed(1)}%)`}
                    >
                      {pct > 0 ? `${pct.toFixed(0)}%` : "-"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
