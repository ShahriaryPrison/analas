// Per-recording deletion for workspace members: removes the chunk files, then the row.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { getRecordingStore } from "@/lib/recordings/store";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
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

  // Files first (retryable), then the row.
  await getRecordingStore().deleteSession(recording.storageKey);
  await prisma.sessionRecording.delete({ where: { id: sessionId } });

  return NextResponse.json({ status: "deleted" });
}
