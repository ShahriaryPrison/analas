"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { eventWithTime } from "@rrweb/types";
import type { Row } from "./insight-card";
import {
  TrashIcon,
  XIcon,
  ChromeIcon,
  SafariIcon,
  FirefoxIcon,
  EdgeIcon,
  WindowsIcon,
  AppleIcon,
  LinuxIcon,
  AndroidIcon,
  GlobeIcon,
} from "@/components/icons";

// Dynamically imported — rrweb-player requires a real DOM and must not run on server.
const RrwebPlayerClient = dynamic(() => import("./rrweb-player-client"), {
  ssr: false,
  loading: () => (
    <div className="h-[430px] w-full animate-pulse rounded-xl bg-white/5 flex items-center justify-center">
      <span className="text-xs text-white/30">Loading player…</span>
    </div>
  ),
});

// Shape of rows returned by the session_recording data route.
type SessionRow = {
  id: string;
  distinctId: string;
  duration: number;
  browser?: string;
  os?: string;
  pagePath?: string;
  chunkCount: number;
  createdAt: string;
};

interface Props {
  rows: Row[] | null;
  nextCursor: string | null;
  error: boolean;
  workspaceId: string;
  insightId: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getBrowserIcon(browser?: string) {
  const b = (browser || "").toLowerCase();
  if (b.includes("chrome")) return <ChromeIcon className="w-3.5 h-3.5" />;
  if (b.includes("safari")) return <SafariIcon className="w-3.5 h-3.5" />;
  if (b.includes("firefox")) return <FirefoxIcon className="w-3.5 h-3.5" />;
  if (b.includes("edge")) return <EdgeIcon className="w-3.5 h-3.5" />;
  return <GlobeIcon className="w-3.5 h-3.5" />;
}

function getOSIcon(os?: string) {
  const o = (os || "").toLowerCase();
  if (o.includes("windows")) return <WindowsIcon className="w-3.5 h-3.5" />;
  if (o.includes("mac") || o.includes("ios") || o.includes("ipad") || o.includes("iphone")) {
    return <AppleIcon className="w-3.5 h-3.5" fill="currentColor" />;
  }
  if (o.includes("linux")) return <LinuxIcon className="w-3.5 h-3.5" />;
  if (o.includes("android")) return <AndroidIcon className="w-3.5 h-3.5" />;
  return null;
}

function ClientBadges({ browser, os }: { browser?: string; os?: string }) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      {browser && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-white/50 leading-none h-4.5">
          {getBrowserIcon(browser)}
          <span className="mt-0.5">{browser}</span>
        </span>
      )}
      {os && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-white/50 leading-none h-4.5">
          {getOSIcon(os)}
          <span className="mt-0.5">{os}</span>
        </span>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function RecordingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-11 w-full animate-pulse rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

// ── Player modal (portaled to <body>, keyboard-accessible) ─────────────────────

interface PlayerModalProps {
  session: SessionRow;
  workspaceId: string;
  onClose: () => void;
}

function PlayerModal({ session, workspaceId, onClose }: PlayerModalProps) {
  const [events, setEvents] = useState<eventWithTime[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch + parse the NDJSON recording (gzip is inflated transparently by fetch).
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/workspace/${workspaceId}/recordings/${session.id}/stream`,
          { signal: ac.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = (await res.text()).trim();
        const parsed = text
          ? text.split("\n").filter(Boolean).map((line) => JSON.parse(line))
          : [];
        setEvents(parsed as eventWithTime[]);
      } catch {
        if (!ac.signal.aborted) setError(true);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [session.id, workspaceId]);

  // Esc to close, focus trap, scroll lock, and focus restore.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Session replay"
        tabIndex={-1}
        className="relative w-full max-w-4xl rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70">
              Session Replay
            </span>
            <span className="text-xs text-white/40 truncate font-mono">
              {session.id.slice(0, 8)}…
            </span>
            {session.distinctId && (
              <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/60 truncate max-w-[140px]">
                {session.distinctId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-white/40">
              <ClientBadges browser={session.browser} os={session.os} />
              <span>{formatDuration(session.duration)}</span>
              <span>{formatDate(session.createdAt)}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close session replay"
              className="text-white/30 hover:text-white transition p-1 rounded hover:bg-white/5"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player area */}
        <div className="p-4">
          {loading && (
            <div className="h-[430px] w-full animate-pulse rounded-xl bg-white/5 flex items-center justify-center">
              <span className="text-xs text-white/30">Loading recording…</span>
            </div>
          )}
          {error && !loading && (
            <div className="h-[430px] w-full rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-center">
              <span className="text-sm text-red-400/70">Failed to load recording.</span>
            </div>
          )}
          {events && events.length === 0 && !error && (
            <div className="h-[430px] w-full rounded-xl bg-white/5 flex items-center justify-center">
              <span className="text-sm text-white/40">No events found in this recording.</span>
            </div>
          )}
          {events && events.length > 0 && <RrwebPlayerClient events={events} />}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Recording list row ────────────────────────────────────────────────────────

interface RecordingRowProps {
  session: SessionRow;
  onOpen: (s: SessionRow) => void;
  onDelete: (id: string) => Promise<void>;
}

function RecordingRow({ session, onOpen, onDelete }: RecordingRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete(e: ReactMouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(session.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group flex items-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition pr-2">
      <button
        onClick={() => onOpen(session)}
        className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* Play icon */}
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>

        {/* Path */}
        <span className="text-xs font-mono text-white/70 truncate min-w-0 flex-1 group-hover:text-white transition">
          {session.pagePath || "/"}
        </span>

        {/* User */}
        <span className="hidden sm:block shrink-0 w-[110px] truncate text-[11px] text-white/40">
          {session.distinctId || "—"}
        </span>

        {/* Browser · OS */}
        <span className="hidden md:block shrink-0 w-[110px] text-right">
          <ClientBadges browser={session.browser} os={session.os} />
        </span>

        {/* Duration */}
        <span className="shrink-0 text-[11px] tabular-nums text-white/50 w-12 text-right">
          {formatDuration(session.duration)}
        </span>

        {/* Date */}
        <span className="shrink-0 text-[10px] text-white/30 w-24 text-right hidden lg:block">
          {formatDate(session.createdAt)}
        </span>
      </button>

      {/* Delete control */}
      {confirming ? (
        <span className="flex items-center gap-1 shrink-0 pl-1">
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="rounded px-2 py-0.5 text-[10px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(false);
            }}
            className="rounded px-2 py-0.5 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/5 transition"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
          aria-label="Delete recording"
          className="shrink-0 p-1.5 rounded-lg text-white/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition focus:opacity-100"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SessionRecordingRenderer({
  rows,
  nextCursor,
  error,
  workspaceId,
  insightId,
}: Props) {
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [extra, setExtra] = useState<SessionRow[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset paging/deletes whenever the base page changes (e.g. parent refetch).
  // Render-phase reset — the recommended pattern over a state-syncing effect.
  const [baseRows, setBaseRows] = useState(rows);
  if (rows !== baseRows) {
    setBaseRows(rows);
    setExtra([]);
    setRemoved(new Set());
    setCursor(nextCursor);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/insights/${insightId}/data?cursor=${cursor}`
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { rows: SessionRow[]; nextCursor: string | null };
      setExtra((prev) => [...prev, ...data.rows]);
      setCursor(data.nextCursor);
    } catch {
      /* leave the list as-is on failure */
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, workspaceId, insightId]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/workspace/${workspaceId}/recordings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRemoved((prev) => new Set(prev).add(id));
        setActiveSession((cur) => (cur?.id === id ? null : cur));
      }
    },
    [workspaceId]
  );

  if (error) {
    return <p className="text-sm text-red-400/70">Could not load recordings.</p>;
  }

  if (!rows) {
    return <RecordingSkeleton />;
  }

  const base = rows as unknown as SessionRow[];
  const sessions = [...base, ...extra].filter((s) => !removed.has(s.id));

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center space-y-2">
        <div className="text-2xl">⏺</div>
        <p className="text-sm text-white/50">No recordings yet.</p>
        <p className="text-[11px] text-white/30 max-w-xs mx-auto">
          Add{" "}
          <code className="bg-white/5 px-1 py-0.5 rounded text-emerald-400/80">
            initSessionRecorder
          </code>{" "}
          to your app to start capturing sessions.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
        <span className="w-6 shrink-0" />
        <span className="flex-1">Path</span>
        <span className="hidden sm:block w-[110px]">User</span>
        <span className="hidden md:block w-[110px] text-right">Client</span>
        <span className="w-12 text-right">Dur.</span>
        <span className="hidden lg:block w-24 text-right">When</span>
        <span className="w-6 shrink-0" />
      </div>

      {/* Session list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1">
        {sessions.map((s) => (
          <RecordingRow key={s.id} session={s} onOpen={setActiveSession} onDelete={handleDelete} />
        ))}

        {cursor && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70 transition disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      {/* Player modal */}
      {activeSession && (
        <PlayerModal
          session={activeSession}
          workspaceId={workspaceId}
          onClose={() => setActiveSession(null)}
        />
      )}
    </>
  );
}
