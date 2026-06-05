"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ZapIcon, SearchIcon, XIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/icons";

type CaptureRow = {
  event: string;
  user_id: string;
  session_id: string;
  properties: string;
  ts: string;
};

type Preset = "all" | "today" | "7d" | "30d";

type Filters = {
  event: string;
  userId: string;
  preset: Preset;
};

type Props = {
  workspaceId: string;
  topEvents: string[];
};

const LIMIT = 50;

function getDateRange(preset: Preset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: fmt(start), dateTo: fmt(now) };
  }
  if (preset === "7d") {
    return { dateFrom: fmt(new Date(now.getTime() - 7 * 86400_000)), dateTo: fmt(now) };
  }
  if (preset === "30d") {
    return { dateFrom: fmt(new Date(now.getTime() - 30 * 86400_000)), dateTo: fmt(now) };
  }
  return { dateFrom: "", dateTo: "" };
}

// --- JSON pretty-printer ---

function JsonValue({ value }: { value: unknown }) {
  if (value === null) return <span className="text-slate-500">null</span>;
  if (typeof value === "boolean") return <span className="text-amber-400">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-sky-400">{value}</span>;
  if (typeof value === "string") return <span className="text-emerald-300">&quot;{value}&quot;</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-white/40">{"[]"}</span>;
    return (
      <span>
        <span className="text-white/40">{"["}</span>
        <div className="pl-4 ml-px border-l border-white/[0.06]">
          {value.map((item, i) => (
            <div key={i}>
              <JsonValue value={item} />
              {i < value.length - 1 && <span className="text-white/25">,</span>}
            </div>
          ))}
        </div>
        <span className="text-white/40">{"]"}</span>
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-white/40">{"{}"}</span>;
    return (
      <span>
        <span className="text-white/40">{"{"}</span>
        <div className="pl-4 ml-px border-l border-white/[0.06]">
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span className="text-violet-300">&quot;{k}&quot;</span>
              <span className="text-white/40">: </span>
              <JsonValue value={v} />
              {i < entries.length - 1 && <span className="text-white/25">,</span>}
            </div>
          ))}
        </div>
        <span className="text-white/40">{"}"}</span>
      </span>
    );
  }

  return <span className="text-white/70">{String(value)}</span>;
}

function JsonView({ raw }: { raw: string }) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && Object.keys(parsed).length === 0) {
      return <span className="text-white/30 text-xs font-mono">{"{ }"}</span>;
    }
    return (
      <div className="text-xs font-mono leading-relaxed">
        <JsonValue value={parsed} />
      </div>
    );
  } catch {
    return <pre className="text-xs font-mono text-white/60 whitespace-pre-wrap">{raw}</pre>;
  }
}

// --- Single capture row ---

function CaptureCard({ capture, workspaceId }: { capture: CaptureRow; workspaceId: string }) {
  const [expanded, setExpanded] = useState(false);

  const u = capture.user_id?.trim() ?? "";
  const s = capture.session_id?.trim() ?? "";
  const bad = new Set(["", "null", "undefined", "''", '""']);
  const hasUserId = !bad.has(u);
  const hasSessionId = !bad.has(s);
  const hasIdentity = hasUserId || hasSessionId;

  let propObj: Record<string, unknown> = {};
  try { propObj = JSON.parse(capture.properties); } catch { /* raw display */ }
  const hasProps = Object.keys(propObj).length > 0 || (typeof propObj !== "object");

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden transition-colors hover:border-white/15">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />

        {/* event + identity badges */}
        <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-semibold text-white text-sm truncate">{capture.event}</span>
          {hasUserId && (
            <span className="inline-flex items-center rounded bg-indigo-500/15 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300 shrink-0">
              usr:{u}
            </span>
          )}
          {hasSessionId && (
            <span className="inline-flex items-center rounded bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-mono text-purple-300 shrink-0">
              sess:{s}
            </span>
          )}
        </div>

        {/* right side: warning, timestamp, expand */}
        <div className="flex items-center gap-2 shrink-0">
          {!hasIdentity && (
            <a
              href={`/workspace/${workspaceId}/settings`}
              title="Missing user/session ID — click to set up"
              className="text-[10px] uppercase font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded hover:bg-amber-500/20 transition"
            >
              ⚠ No identity
            </a>
          )}
          <span className="text-[11px] text-white/35 tabular-nums">{capture.ts}</span>
          <button
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse payload" : "Expand payload"}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition
              ${expanded
                ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
                : "text-white/40 bg-white/5 border-white/10 hover:text-white/70 hover:bg-white/8"
              }`}
          >
            {expanded ? "Hide" : "Payload"}
            {expanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] bg-slate-950/70 px-4 py-3">
          {hasProps
            ? <JsonView raw={capture.properties} />
            : <span className="text-xs text-white/30 font-mono italic">no properties</span>
          }
        </div>
      )}
    </div>
  );
}

// --- Main client component ---

export default function CapturesClient({ workspaceId, topEvents }: Props) {
  const [filters, setFilters] = useState<Filters>({ event: "", userId: "", preset: "all" });
  const [rows, setRows] = useState<CaptureRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCaptures = useCallback(
    async (f: Filters, off: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const { dateFrom, dateTo } = getDateRange(f.preset);
      const p = new URLSearchParams();
      if (f.event) p.set("event", f.event);
      if (f.userId) p.set("userId", f.userId);
      if (dateFrom) p.set("dateFrom", dateFrom);
      if (dateTo) p.set("dateTo", dateTo);
      p.set("offset", String(off));
      p.set("limit", String(LIMIT));

      try {
        const res = await fetch(`/api/workspace/${workspaceId}/captures?${p}`);
        const data = await res.json();
        setRows((prev) => (append ? [...prev, ...(data.rows ?? [])] : (data.rows ?? [])));
        setTotal(data.total ?? 0);
      } catch {
        /* network errors stay silent — just stop spinner */
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    fetchCaptures(filters, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(next: Filters) {
    setFilters(next);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCaptures(next, 0, false), 350);
  }

  function handlePreset(preset: Preset) {
    applyFilters({ ...filters, preset });
  }

  function clearFilters() {
    applyFilters({ event: "", userId: "", preset: "all" });
  }

  function loadMore() {
    const next = offset + LIMIT;
    setOffset(next);
    fetchCaptures(filters, next, true);
  }

  const hasActiveFilters = filters.event !== "" || filters.userId !== "" || filters.preset !== "all";
  const hasMore = rows.length < total;

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "all", label: "All time" },
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7d" },
    { key: "30d", label: "Last 30d" },
  ];

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Event search */}
          <div className="relative flex-1 min-w-48">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            <input
              type="text"
              list="event-suggestions"
              placeholder="Filter by event name…"
              value={filters.event}
              onChange={(e) => applyFilters({ ...filters, event: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition"
            />
            <datalist id="event-suggestions">
              {topEvents.map((ev) => <option key={ev} value={ev} />)}
            </datalist>
            {filters.event && (
              <button
                onClick={() => applyFilters({ ...filters, event: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* User ID search */}
          <div className="relative flex-1 min-w-40">
            <input
              type="text"
              placeholder="Filter by user ID…"
              value={filters.userId}
              onChange={(e) => applyFilters({ ...filters, userId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition"
            />
            {filters.userId && (
              <button
                onClick={() => applyFilters({ ...filters, userId: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Preset pills + clear */}
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition
                ${filters.preset === key
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:bg-white/8"
                }`}
            >
              {label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 bg-white/5 border border-white/10 hover:bg-white/8 transition"
            >
              <XIcon className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <div className="flex items-center gap-2 text-xs text-white/35 px-1">
          {hasActiveFilters
            ? <><span className="text-white/60 font-medium">{total.toLocaleString()}</span> events match your filters</>
            : <><span className="text-white/60 font-medium">{total.toLocaleString()}</span> total events</>
          }
          {rows.length < total && (
            <span className="text-white/25">— showing first {rows.length.toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl border border-white/8 bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 mb-4 border border-white/10">
            <ZapIcon className="w-5 h-5 text-white/40" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            {hasActiveFilters ? "No events match" : "No events yet"}
          </h3>
          <p className="text-sm text-white/40 max-w-xs mx-auto">
            {hasActiveFilters
              ? "Try adjusting your filters or broadening the time range."
              : "Send your first event to the capture API and it will appear here."
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 transition"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((capture, i) => (
            <CaptureCard
              key={`${capture.ts}-${i}`}
              capture={capture}
              workspaceId={workspaceId}
            />
          ))}

          {hasMore && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/8 transition disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : `Load more (${(total - rows.length).toLocaleString()} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
