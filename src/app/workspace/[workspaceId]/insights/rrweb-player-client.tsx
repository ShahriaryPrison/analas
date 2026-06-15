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
  // Measure on the wrapper (stable, full-width) and mount the player into a child,
  // so the player's own injected DOM never feeds back into the width measurement.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || events.length === 0 || width === 0) return;

    let player: { pause?: () => void } | null = null;
    let cancelled = false;

    import("rrweb-player").then(({ default: Replayer }) => {
      if (cancelled) return;
      mount.innerHTML = "";
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
    });

    return () => {
      cancelled = true;
      try {
        player?.pause?.();
      } catch {
        /* rrweb-player exposes no destroy(); innerHTML reset below is the teardown */
      }
      mount.innerHTML = "";
    };
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
