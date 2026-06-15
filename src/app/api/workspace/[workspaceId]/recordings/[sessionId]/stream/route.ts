// Streams a recording back to authenticated workspace members as gzip-encoded NDJSON.
// The on-disk path is never user-controlled: `storageKey` comes from the DB row, and
// the store refuses any key that escapes its root.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { createGunzip, createGzip } from "node:zlib";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { getRecordingStore } from "@/lib/recordings/store";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; sessionId: string }> }
) {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, sessionId } = await context.params;
  if (!UUID_V4_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  // Caller must be a member of the workspace.
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email: session.user.email! } },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recording = await prisma.sessionRecording.findFirst({
    where: { id: sessionId, workspaceId },
    select: { storageKey: true },
  });
  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = await getRecordingStore().openSession(recording.storageKey);
  if (!stream) {
    // Row exists but no chunks on disk yet — empty body, not an error.
    return new Response("", {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  }

  // The store concatenates one immutable gzip member per flush. That is a valid
  // multi-member gzip stream, but a browser's transparent `Content-Encoding: gzip`
  // decoder only inflates the FIRST member — so any session with more than one
  // flushed chunk would fail to load in the client. Re-encode here as a single
  // member: gunzip the concatenated stream (Node handles multi-member correctly)
  // and re-gzip it, so the browser always receives exactly one gzip member.
  const source = Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0]);
  const gunzip = createGunzip();
  const gzip = createGzip();
  source.on("error", (err) => gunzip.destroy(err));
  gunzip.on("error", (err) => {
    console.error("[recordings:stream] gunzip failed sessionId=%s", sessionId, err);
    gzip.destroy(err);
  });
  source.pipe(gunzip).pipe(gzip);

  return new Response(Readable.toWeb(gzip) as ReadableStream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Content-Encoding": "gzip",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
