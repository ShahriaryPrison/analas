"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, XIcon } from "@/components/icons";

type EventItem = {
  name: string;
  isArchived: boolean;
};

type Props = {
  workspaceId: string;
  initialEvents: EventItem[];
};

export default function EventsClient({ workspaceId, initialEvents }: Props) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [search, setSearch] = useState("");
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleArchive(name: string, isArchived: boolean) {
    setLoadingName(name);
    setToast(null);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/events/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName: name, isArchived }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.name === name ? { ...e, isArchived } : e))
        );
        setToast({
          ok: true,
          text: `Event "${name}" ${isArchived ? "archived successfully" : "unarchived successfully"}.`,
        });
      } else {
        const d = await res.json();
        setToast({ ok: false, text: d.error || "Failed to update event setting." });
      }
    } catch {
      setToast({ ok: false, text: "An unexpected error occurred." });
    } finally {
      setLoadingName(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header action link */}
      <div>
        <Link
          href={`/workspace/${workspaceId}/settings`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 transition cursor-pointer"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Events Manager Panel */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search captured events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-emerald-400/40 transition"
            />
          </div>
          <div className="text-xs text-white/40 font-medium">
            Showing {filteredEvents.length} of {events.length} event types
          </div>
        </div>

        <div className="space-y-2">
          {filteredEvents.length ? (
            filteredEvents.map((e) => (
              <div
                key={e.name}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      e.isArchived ? "bg-white/20" : "bg-emerald-400"
                    }`}
                  />
                  <span className="font-semibold text-white text-sm truncate select-all">
                    {e.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase border shrink-0 ${
                      e.isArchived
                        ? "bg-white/5 text-white/40 border-white/5"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/10"
                    }`}
                  >
                    {e.isArchived ? "Archived" : "Active"}
                  </span>
                </div>

                <button
                  disabled={loadingName === e.name}
                  onClick={() => toggleArchive(e.name, !e.isArchived)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition duration-200 shrink-0 cursor-pointer ${
                    e.isArchived
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {loadingName === e.name
                    ? "Updating…"
                    : e.isArchived
                    ? "Unarchive"
                    : "Archive"}
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/45">
              {search ? "No events found matching your search." : "No events captured in ClickHouse yet."}
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-2xl text-sm font-medium max-w-sm backdrop-blur-sm transition-all duration-300 ${
            toast.ok
              ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200 shadow-emerald-900/50"
              : "bg-red-900/90 border-red-500/40 text-red-200 shadow-red-900/50"
          }`}
        >
          <div
            className={`shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
              toast.ok ? "bg-emerald-500/30" : "bg-red-500/30"
            }`}
          >
            {toast.ok ? (
              <CheckIcon className="w-3 h-3 text-emerald-300" />
            ) : (
              <XIcon className="w-3 h-3 text-red-300" />
            )}
          </div>
          <span className="flex-1 leading-snug">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="shrink-0 text-white/30 hover:text-white/70 transition"
            aria-label="Dismiss"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
