"use client";

// Leaf component loaded via next/dynamic ssr:false — safe to reference DOM APIs.
// Uses rrweb's CORE Replayer directly. The rrweb-player Svelte wrapper silently
// fails to build its iframe in this Next/prod environment (renders only an empty
// `.rr-player` shell), so we mount the Replayer ourselves, scale its iframe to
// fit, and drive a small control bar. Peer dep: rrweb, @rrweb/types.

import { useCallback, useEffect, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import "rrweb/dist/style.css";

interface RrwebPlayerClientProps {
  events: eventWithTime[];
  height?: number;
}

type CoreReplayer = {
  play: (timeOffset?: number) => void;
  pause: (timeOffset?: number) => void;
  getCurrentTime: () => number;
  getMetaData: () => { startTime: number; endTime: number; totalTime: number };
  on: (event: string, cb: (...args: unknown[]) => void) => void;
};

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function RrwebPlayerClient({ events, height = 430 }: RrwebPlayerClientProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<CoreReplayer | null>(null);

  // Lock the width to the first positive measurement (see notes in prior versions:
  // observing width churn caused a remount loop).
  const [width, setWidth] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || width > 0) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    };
    measure();
    if (el.clientWidth > 0) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || events.length === 0 || width === 0) return;

    let cancelled = false;
    let raf = 0;

    import("rrweb").then(({ Replayer }) => {
      if (cancelled) return;
      mount.innerHTML = "";

      const replayer = new (Replayer as unknown as new (
        e: eventWithTime[],
        cfg: unknown
      ) => CoreReplayer)(events, {
        root: mount,
        skipInactive: true,
        showWarning: false,
        mouseTail: false,
      });
      replayerRef.current = replayer;

      // Scale the recorded viewport to fit the player box (contain), centered.
      const meta = (events.find((e) => (e as { type?: number }).type === 4) as
        | { data?: { width?: number; height?: number } }
        | undefined)?.data;
      const recW = meta?.width || 1024;
      const recH = meta?.height || 768;
      const scale = Math.min(width / recW, height / recH);
      const wrap = mount.querySelector<HTMLElement>(".replayer-wrapper");
      if (wrap) {
        wrap.style.transform = `scale(${scale})`;
        wrap.style.transformOrigin = "top left";
        wrap.style.position = "absolute";
        wrap.style.left = `${(width - recW * scale) / 2}px`;
        wrap.style.top = `${(height - recH * scale) / 2}px`;
      }

      const md = replayer.getMetaData();
      setTotalTime(md.totalTime);

      replayer.play();
      setPlaying(true);

      const tick = () => {
        if (cancelled) return;
        setCurrentTime(replayer.getCurrentTime());
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      replayer.on("finish", () => {
        if (!cancelled) setPlaying(false);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try {
        replayerRef.current?.pause();
      } catch {
        /* no destroy() on core Replayer; innerHTML reset is the teardown */
      }
      replayerRef.current = null;
      mount.innerHTML = "";
    };
  }, [events, width, height]);

  const togglePlay = useCallback(() => {
    const r = replayerRef.current;
    if (!r) return;
    if (playing) {
      r.pause();
      setPlaying(false);
    } else {
      r.play(currentTime >= totalTime ? 0 : currentTime);
      setPlaying(true);
    }
  }, [playing, currentTime, totalTime]);

  const onSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const r = replayerRef.current;
      if (!r) return;
      const t = Number(e.target.value);
      setCurrentTime(t);
      if (playing) r.play(t);
      else r.pause(t);
    },
    [playing]
  );

  return (
    <div ref={wrapperRef} className="w-full">
      <div className="rounded-xl overflow-hidden bg-black/40">
        <div
          ref={mountRef}
          className="relative overflow-hidden bg-white"
          style={{ width: width || "100%", height }}
        />
        <div className="flex items-center gap-3 px-3 py-2 bg-black/70 border-t border-white/10">
          <button
            onClick={togglePlay}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={totalTime || 0}
            value={Math.min(currentTime, totalTime || 0)}
            onChange={onSeek}
            className="flex-1 accent-emerald-400 cursor-pointer"
          />
          <span className="shrink-0 text-[11px] tabular-nums text-white/50">
            {fmt(currentTime)} / {fmt(totalTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
