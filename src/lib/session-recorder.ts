/**
 * ANALAS Session Recorder
 *
 * Usage (in your root layout or providers — client component):
 *
 *   import { initSessionRecorder } from "@/lib/session-recorder";
 *   useEffect(() => initSessionRecorder({ apiKey: process.env.NEXT_PUBLIC_ANALAS_KEY! }), []);
 *
 * Required peer dependency:  npm install rrweb @rrweb/types
 */

import { record } from "rrweb";
import type { eventWithTime } from "@rrweb/types";

export interface SessionRecorderOptions {
  /** Public API key (same one used for /api/capture). */
  apiKey: string;
  /** Ingestion endpoint. Defaults to /api/record. */
  endpoint?: string;
  /**
   * Fraction of sessions to record (0–1).
   * 0.2 = 20% of users. Applied once per session via sessionStorage flag.
   */
  sampleRate?: number;
  /** Path prefixes where recording is skipped (e.g. ["/admin", "/settings"]). */
  excludePaths?: string[];
  /** How often (ms) buffered events are flushed. Default: 5000. */
  flushIntervalMs?: number;
  /**
   * A stable user identifier to attach to the recording.
   * Pass this after login — it is sent with every chunk.
   */
  distinctId?: string;
  /**
   * Mask every text node on the page, not just form inputs. Off by default;
   * enable for stricter privacy/compliance (replay shows redacted text everywhere).
   */
  maskAllText?: boolean;
  /** CSS selector for elements to fully block from capture (e.g. "iframe, .secret"). */
  blockSelector?: string;
}

// ── Minimal user-agent sniffers (no external lib) ─────────────────────────────

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Other";
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Other";
}

// ── Gzip + base64 via native CompressionStream (Chrome 80+, FF 113+, Safari 16.4+) ──

async function gzipBase64(data: string): Promise<string | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(new TextEncoder().encode(data));
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }

    // btoa over a byte array — safe for arbitrary binary
    let binary = "";
    for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

// ── Main initializer ──────────────────────────────────────────────────────────

/**
 * Starts the session recorder and returns a cleanup function.
 * Call cleanup() on component unmount or router navigation if needed.
 */
export function initSessionRecorder(opts: SessionRecorderOptions): () => void {
  const {
    apiKey,
    endpoint = "/api/record",
    sampleRate = 0.2,
    excludePaths = [],
    flushIntervalMs = 5000,
    distinctId,
    maskAllText = false,
    blockSelector,
  } = opts;

  // ── Sampling decision (sticky per browser session) ────────────────────────
  const SAMPLE_KEY = "_analas_record";
  let shouldRecord = sessionStorage.getItem(SAMPLE_KEY);
  if (shouldRecord === null) {
    shouldRecord = Math.random() < sampleRate ? "1" : "0";
    sessionStorage.setItem(SAMPLE_KEY, shouldRecord);
  }
  if (shouldRecord !== "1") return () => {};

  // ── Path exclusion ────────────────────────────────────────────────────────
  const currentPath = location.pathname;
  if (excludePaths.some((p) => currentPath.startsWith(p))) return () => {};

  // ── Session ID (stable across page navigations within the same tab) ───────
  const SID_KEY = "_analas_sid";
  let sessionId = sessionStorage.getItem(SID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SID_KEY, sessionId);
  }

  // ── Metadata collected once ───────────────────────────────────────────────
  const browser = detectBrowser();
  const os = detectOS();
  const pagePath = location.pathname;
  const startedAt = Date.now();

  // ── Event buffer ──────────────────────────────────────────────────────────
  const eventBuffer: eventWithTime[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  async function flush(keepalive = false): Promise<void> {
    if (eventBuffer.length === 0) return;
    const events = eventBuffer.splice(0);
    const duration = Math.floor((Date.now() - startedAt) / 1000);

    const jsonStr = JSON.stringify(events);
    const compressed = await gzipBase64(jsonStr);

    const payload: Record<string, unknown> = {
      sessionId,
      distinctId: distinctId ?? "",
      browser,
      os,
      pagePath,
      duration,
    };

    if (compressed) {
      payload.eventsGzip = compressed;
    } else {
      payload.events = events;
    }

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive,
      });
    } catch {
      // Silently fail — analytics should never break the host app
    }
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, flushIntervalMs);
  }

  // ── Start rrweb recording ─────────────────────────────────────────────────
  const stopRecording = record({
    maskAllInputs: true,                          // form inputs are always masked
    // maskAllText → redact every text node; otherwise only opt-in [data-mask] elements
    maskTextSelector: maskAllText ? "*" : "[data-mask]",
    ...(blockSelector ? { blockSelector } : {}),  // fully drop matched elements
    sampling: {
      mousemove: 100,             // throttle mousemove to 100ms
      mouseInteraction: true,
      scroll: 150,
      input: "last",
    },
    emit(event) {
      eventBuffer.push(event);
      scheduleFlush();
    },
  });

  // ── Flush on page hide (more reliable than beforeunload) ─────────────────
  function onPageHide() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (eventBuffer.length === 0) return;
    // keepalive=true lets the browser complete the fetch after page unload
    flush(true);
  }
  window.addEventListener("pagehide", onPageHide);

  // ── Stop recording if the SPA navigates into an excluded path ─────────────
  // rrweb records continuously across client-side route changes, so excludePaths
  // must be re-checked on navigation — not only at init.
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  function onNavigate() {
    if (excludePaths.some((ex) => location.pathname.startsWith(ex))) cleanup();
  }
  history.pushState = function (...args: Parameters<History["pushState"]>) {
    const r = origPush.apply(history, args);
    onNavigate();
    return r;
  };
  history.replaceState = function (...args: Parameters<History["replaceState"]>) {
    const r = origReplace.apply(history, args);
    onNavigate();
    return r;
  };
  window.addEventListener("popstate", onNavigate);

  // ── Cleanup (idempotent) ──────────────────────────────────────────────────
  let stopped = false;
  function cleanup() {
    if (stopped) return;
    stopped = true;
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("popstate", onNavigate);
    history.pushState = origPush;
    history.replaceState = origReplace;
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    stopRecording?.();
    flush();
  }

  return cleanup;
}
