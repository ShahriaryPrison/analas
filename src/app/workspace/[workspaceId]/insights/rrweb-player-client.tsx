"use client";

// Leaf component loaded via next/dynamic ssr:false — safe to reference DOM APIs.
// Peer deps: rrweb-player, @rrweb/types.

import { useEffect, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import "rrweb-player/dist/style.css";

interface RrwebPlayerClientProps {
  events: eventWithTime[];
  height?: number;
}

export default function RrwebPlayerClient({ events, height = 430 }: RrwebPlayerClientProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  // Lock the width to the FIRST positive measurement. The player injects/removes
  // DOM as it builds, which transiently collapses the modal width; observing that
  // churn and rebuilding the player on every change creates a remount loop that
  // never lets the replay iframe finish mounting. One measurement, one build.
  const [width, setWidth] = useState(0);

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

    let player: { pause?: () => void } | null = null;
    let cancelled = false;

    const onErr = (e: ErrorEvent | PromiseRejectionEvent) => {
      const err = "error" in e ? e.error : (e as PromiseRejectionEvent).reason;
      console.error("[player] captured error:", err?.message || err, err);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onErr);

    import("rrweb-player").then(({ default: Replayer }) => {
      if (cancelled) return;
      mount.innerHTML = "";
      try {
        player = new (Replayer as unknown as new (cfg: unknown) => { pause?: () => void })({
          target: mount,
          props: {
            events,
            width,
            height,
            skipInactive: true,
            showController: true,
            speedOption: [1, 2, 4],
          },
        });
      } catch (err) {
        console.error("[player] Replayer construction threw", err);
      }
      setTimeout(() => {
        if (cancelled) return;
        const iframe = mount.querySelector("iframe");
        const doc = iframe?.contentDocument;
        console.log("[player] post-mount", {
          mountHtmlLen: mount.innerHTML.length,
          hasRrPlayer: !!mount.querySelector(".rr-player"),
          hasIframe: !!iframe,
          iframeWH: iframe ? `${iframe.clientWidth}x${iframe.clientHeight}` : null,
          frameWH: iframe ? `${iframe.getAttribute("width")}x${iframe.getAttribute("height")}` : null,
          bodyChildren: doc?.body?.childElementCount,
          bodyTextLen: doc?.body?.innerText?.length,
        });
      }, 800);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onErr);
      try {
        player?.pause?.();
      } catch {
        /* rrweb-player exposes no destroy(); innerHTML reset below is the teardown */
      }
      mount.innerHTML = "";
    };
    // `width` is locked after the first measurement, so this builds the player once.
  }, [events, width, height]);

  return (
    <div ref={wrapperRef} className="w-full">
      <div
        ref={mountRef}
        className="flex items-center justify-center overflow-hidden rounded-xl bg-black/40"
        style={{ minHeight: height }}
      />
    </div>
  );
}
