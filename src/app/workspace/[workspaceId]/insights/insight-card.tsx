"use client";

import { useEffect, useState } from "react";
import { getInsightType } from "@/lib/insight-types";
import { BarChart2Icon, ActivityIcon } from "@/components/icons";
import DeleteInsightButton from "./delete-insight-button";

type Row = { day: string; count: number };
type InsightData = { total: number; rows: Row[] };

type Props = {
  workspaceId: string;
  insight: {
    id: string;
    name: string;
    type: string;
    eventName: string;
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
    <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {insight.type === "count" ? (
              <BarChart2Icon className="w-3.5 h-3.5 text-white/30" />
            ) : (
              <ActivityIcon className="w-3.5 h-3.5 text-white/30" />
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
              {typeDef.label}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{insight.name}</h3>
          <p className="text-sm text-white/50">Event: {insight.eventName || "—"}</p>
        </div>
        <div className="flex items-center gap-3">
          {data ? (
            <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
              {data.total.toLocaleString()} {data.total === 1 ? "event" : "events"}
            </div>
          ) : !error ? (
            <div className="h-7 w-24 animate-pulse rounded-full bg-white/10" />
          ) : null}
          <DeleteInsightButton workspaceId={workspaceId} insightId={insight.id} />
        </div>
      </div>

      {/* Body */}
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
            <TrendChart rows={data.rows} />
          )}
        </div>
      )}

      {insight.type === "count" && error && (
        <p className="text-sm text-red-400/70">Could not load data.</p>
      )}
    </article>
  );
}

function TrendChart({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {rows.map((row) => (
        <div key={row.day} className="flex flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end rounded-lg border border-white/10 bg-white/5 p-2">
            <div
              className="w-full rounded-md bg-emerald-400 transition-all duration-500"
              style={{ height: `${(row.count / max) * 100}%`, minHeight: row.count > 0 ? "4px" : "0" }}
            />
          </div>
          <div className="text-[11px] text-white/50">{row.day.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}
