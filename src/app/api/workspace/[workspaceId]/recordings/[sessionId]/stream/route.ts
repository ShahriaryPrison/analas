// Streams a recording back to authenticated workspace members as gzip-encoded NDJSON.
// The on-disk path is never user-controlled: `storageKey` comes from the DB row, and
// the store refuses any key that escapes its root.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { gunzipSync } from "node:zlib";
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
  // decoder only reliably inflates the FIRST member, so multi-chunk sessions broke
  // in the client. Decode the whole thing here (Node handles multi-member gzip) and
  // return plain NDJSON — no Content-Encoding, no streaming-error -> 502 surface.
  let ndjson: Buffer;
  try {
    const compressed = await streamToBuffer(stream);
    ndjson = gunzipSync(compressed);
  } catch (err) {
    console.error(
      "[recordings:stream] decode failed sessionId=%s storageKey=%s",
      sessionId,
      recording.storageKey,
      err
    );
    return NextResponse.json({ error: "Failed to decode recording" }, { status: 500 });
  }

  return new Response(ndjson.toString("utf-8"), {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0])) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}
