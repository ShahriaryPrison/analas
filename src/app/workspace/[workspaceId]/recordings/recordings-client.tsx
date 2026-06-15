"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { eventWithTime } from "@rrweb/types";
import Link from "next/link";
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
  PlayIcon,
  SparklesIcon,
  SlidersIcon,
  CopyIcon,
  CheckIcon,
} from "@/components/icons";

// Dynamically import player client to skip SSR
const RrwebPlayerClient = dynamic(() => import("../insights/rrweb-player-client"), {
  ssr: false,
  loading: () => (
    <div className="h-[430px] w-full animate-pulse rounded-xl bg-white/5 flex items-center justify-center">
      <span className="text-xs text-white/30">Loading player…</span>
    </div>
  ),
});

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
  workspaceId: string;
  initialCount: number;
  activeKeyName: string | null;
  publicToken: string | null;
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

// ── Copyable Code Block ───────────────────────────────────────────────────────
function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <pre className="rounded-xl bg-slate-950 border border-white/10 p-4 text-xs font-mono text-white/80 overflow-x-auto whitespace-pre leading-relaxed select-all">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition"
        title="Copy code"
      >
        {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ── Setup Instructions Guide ─────────────────────────────────────────────────
function SetupInstructions({
  workspaceId,
  activeKeyName,
  hostUrl,
  publicToken,
}: {
  workspaceId: string;
  activeKeyName: string | null;
  hostUrl: string;
  publicToken: string | null;
}) {
  const code = `<!-- Load the ANALAS Session Recorder -->
<script src="${hostUrl}/session-recorder.js"></script>

<script>
  AnalasRecorder.init({
    apiKey: "${publicToken || "YOUR_WORKSPACE_PUBLIC_TOKEN"}",
    sampleRate: 1.0                  // Record 100% of sessions for testing (0-1)
  });
</script>`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-emerald-400" />
          Frictionless Script-Tag Setup
        </h3>
        <p className="text-xs text-white/55 leading-relaxed">
          Copy and paste this snippet into the <code className="bg-white/5 text-emerald-300 px-1 py-0.5 rounded">&lt;head&gt;</code> of your website. It compiles `rrweb` and our optimizer automatically.
        </p>
      </div>

      <CopyableCode code={code} />

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Where is my API Key?</h4>
        <p className="text-xs text-white/50 leading-relaxed">
          You can create or copy your API key under workspace settings:
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/workspace/${workspaceId}/settings`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/15 transition"
          >
            <SlidersIcon className="w-3.5 h-3.5" />
            Go to Settings &rarr; API Keys
          </Link>
          {activeKeyName && (
            <span className="text-[10px] text-white/30 font-medium">
              (Active key detected: <code className="text-emerald-400/70 font-mono">"{activeKeyName}"</code>)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Setup Modal ──────────────────────────────────────────────────────────────
interface SetupModalProps {
  workspaceId: string;
  activeKeyName: string | null;
  hostUrl: string;
  publicToken: string | null;
  onClose: () => void;
}

function SetupModal({ workspaceId, activeKeyName, hostUrl, publicToken, onClose }: SetupModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl relative space-y-6"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold text-white">How to Setup Replays</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition p-1 rounded hover:bg-white/5"
          >
            <XIcon className="w-4.5 h-4.5" />
          </button>
        </div>
        <SetupInstructions
          workspaceId={workspaceId}
          activeKeyName={activeKeyName}
          hostUrl={hostUrl}
          publicToken={publicToken}
        />
      </div>
    </div>,
    document.body
  );
}

// ── Player Modal ─────────────────────────────────────────────────────────────
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
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
        <div className="p-4 bg-slate-900/40">
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

// ── Session List Row ─────────────────────────────────────────────────────────
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
          <PlayIcon className="w-3 h-3 text-emerald-400 fill-emerald-400" />
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

// ── MAIN CLIENT ──────────────────────────────────────────────────────────────
export default function RecordingsClient({
  workspaceId,
  initialCount,
  activeKeyName,
  publicToken,
}: Props) {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(initialCount);

  const [pagePath, setPagePath] = useState("");
  const [distinctId, setDistinctId] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const [showSetup, setShowSetup] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [hostUrl, setHostUrl] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostUrl(window.location.origin);
    }
  }, []);

  const fetchRecordings = useCallback(
    async (cursor?: string, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      setError(false);

      try {
        const query = new URLSearchParams();
        if (pagePath.trim()) query.set("pagePath", pagePath.trim());
        if (distinctId.trim()) query.set("distinctId", distinctId.trim());
        if (cursor) query.set("cursor", cursor);

        const res = await fetch(`/api/workspace/${workspaceId}/recordings?${query}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {
          rows: SessionRow[];
          nextCursor: string | null;
          total: number;
        };

        if (append) {
          setRows((prev) => [...(prev || []), ...data.rows]);
        } else {
          setRows(data.rows);
        }
        setNextCursor(data.nextCursor);
        setTotalCount(data.total);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [workspaceId, pagePath, distinctId]
  );

  // Fetch on mount if there are recordings
  useEffect(() => {
    if (initialCount > 0) {
      fetchRecordings();
    } else {
      setRows([]);
    }
  }, [initialCount, fetchRecordings]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/workspace/${workspaceId}/recordings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRows((prev) => (prev ? prev.filter((s) => s.id !== id) : null));
        setTotalCount((c) => Math.max(0, c - 1));
        setActiveSession((cur) => (cur?.id === id ? null : cur));
      }
    },
    [workspaceId]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecordings();
  };

  // 1. Onboarding Empty State Setup Guide
  const isSearchActive = pagePath.trim().length > 0 || distinctId.trim().length > 0;
  if (totalCount === 0 && !isSearchActive && rows !== null) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⏺
          </div>
          <h2 className="text-xl font-bold text-white mt-4">Setup Session Replays</h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto">
            You haven't captured any sessions yet! Add the recorder tag to start playing back real user visits.
          </p>
        </div>

        <SetupInstructions
          workspaceId={workspaceId}
          activeKeyName={activeKeyName}
          hostUrl={hostUrl}
          publicToken={publicToken}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Onboarding button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white/5 border border-white/5 rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex-1 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Filter by path (e.g. /map)"
              value={pagePath}
              onChange={(e) => setPagePath(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/30 outline-none transition"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Filter by User ID"
              value={distinctId}
              onChange={(e) => setDistinctId(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/30 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 py-2 text-sm font-semibold text-slate-950 transition cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        <button
          onClick={() => setShowSetup(true)}
          className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:text-white transition shrink-0"
        >
          Setup Instructions
        </button>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {loading && !rows && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 w-full animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-center text-sm text-red-400">
            Failed to load recordings. Please try again.
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-white/45">
            No recordings found matching your filters.
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="space-y-2">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/25">
              <span className="w-6 shrink-0" />
              <span className="flex-1">Path</span>
              <span className="hidden sm:block w-[110px]">User</span>
              <span className="hidden md:block w-[110px] text-right">Client</span>
              <span className="w-12 text-right">Dur.</span>
              <span className="hidden lg:block w-24 text-right">When</span>
              <span className="w-6 shrink-0" />
            </div>

            {/* List */}
            <div className="space-y-1.5">
              {rows.map((s) => (
                <RecordingRow key={s.id} session={s} onOpen={setActiveSession} onDelete={handleDelete} />
              ))}
            </div>

            {/* Pagination */}
            {nextCursor && (
              <button
                onClick={() => fetchRecordings(nextCursor, true)}
                disabled={loadingMore}
                className="w-full mt-4 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/70 transition disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSetup && (
        <SetupModal
          workspaceId={workspaceId}
          activeKeyName={activeKeyName}
          hostUrl={hostUrl}
          publicToken={publicToken}
          onClose={() => setShowSetup(false)}
        />
      )}

      {activeSession && (
        <PlayerModal
          session={activeSession}
          workspaceId={workspaceId}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
}
