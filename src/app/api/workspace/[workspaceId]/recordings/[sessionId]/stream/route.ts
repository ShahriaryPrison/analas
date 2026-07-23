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
import type { Plan } from "@/lib/billing/plans";

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
  const [member, workspace] = await Promise.all([
    prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email: session.user.email! } },
      select: { id: true },
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    }),
  ]);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { hasFeature } = await import("@/lib/billing/plans");
  if (!workspace || !hasFeature(workspace.plan as Plan, "session_recording")) {
    return NextResponse.json(
      { error: "Session Recording is not available on your current plan. Please upgrade." },
      { status: 403 }
    );
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

  // Chunks are stored as gzip, but some S3-compatible endpoints transparently
  // inflate objects that carry `Content-Encoding: gzip` metadata on GET, so the
  // bytes here may be either raw gzip (one concatenated member per flush) or
  // already-decompressed NDJSON. Detect the gzip magic (1f 8b) and only gunzip
  // when the bytes are actually compressed; `gunzipSync` handles the multi-member
  // case. Either way we return plain NDJSON with no `Content-Encoding`, so the
  // browser never has to inflate anything itself.
  let ndjson: Buffer;
  try {
    const raw = await streamToBuffer(stream);
    const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
    ndjson = isGzip ? gunzipSync(raw) : raw;
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
