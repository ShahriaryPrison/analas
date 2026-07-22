// Streams a recording back to an API key scoped to `recordings:read`, mirroring
// src/app/api/workspace/[workspaceId]/recordings/[sessionId]/stream/route.ts (session-gated twin).
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { gunzipSync } from "node:zlib";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hasFeature, type Plan } from "@/lib/billing/plans";
import { getRecordingStore } from "@/lib/recordings/store";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const auth = await resolveApiKey(req, { scope: "recordings:read" });
  if (auth instanceof NextResponse) return auth;

  const { sessionId } = await context.params;
  if (!UUID_V4_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  if (!hasFeature(auth.plan as Plan, "session_recording")) {
    return NextResponse.json(
      { error: "Session Recording is not available on your current plan. Please upgrade." },
      { status: 403 }
    );
  }

  const recording = await prisma.sessionRecording.findFirst({
    where: { id: sessionId, workspaceId: auth.workspaceId },
    select: { storageKey: true },
  });
  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = await getRecordingStore().openSession(recording.storageKey);
  if (!stream) {
    return new Response("", {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  }

  let ndjson: Buffer;
  try {
    const raw = await streamToBuffer(stream);
    const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
    ndjson = isGzip ? gunzipSync(raw) : raw;
  } catch (err) {
    console.error(
      "[v1/recordings:stream] decode failed sessionId=%s storageKey=%s",
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
