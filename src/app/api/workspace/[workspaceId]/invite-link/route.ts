import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import crypto from "node:crypto";

type Params = { params: Promise<{ workspaceId: string }> };

async function resolveAccess(workspaceId: string) {
  const session = await getAppSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email: session.user.email } },
  });

  if (!membership || membership.role === "MEMBER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, membership };
}

// ── GET — get current public link info ───────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId);
  if ("error" in result) return result.error;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { inviteLinkEnabled: true },
  });

  if (!workspace?.inviteLinkEnabled) {
    return NextResponse.json({ enabled: false, token: null });
  }

  const linkInvite = await prisma.workspaceInvite.findFirst({
    where: { workspaceId, email: null, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    enabled: true,
    token: linkInvite?.token ?? null,
    expiresAt: linkInvite?.expiresAt ?? null,
  });
}

// ── POST — enable / regenerate public link ────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId);
  if ("error" in result) return result.error;

  const body = await req.json().catch(() => ({}));
  const expiresAt: string | null = body.expiresAt ?? null;

  // Delete any existing public link invites for this workspace
  await prisma.workspaceInvite.deleteMany({
    where: { workspaceId, email: null },
  });

  const token = crypto.randomBytes(24).toString("base64url");
  const invite = await prisma.workspaceInvite.create({
    data: {
      token,
      email: null,
      role: "MEMBER",
      workspaceId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Ensure the flag is set
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { inviteLinkEnabled: true },
  });

  return NextResponse.json({
    enabled: true,
    token: invite.token,
    expiresAt: invite.expiresAt,
  }, { status: 201 });
}

// ── DELETE — disable public link ──────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId);
  if ("error" in result) return result.error;

  await prisma.workspaceInvite.deleteMany({ where: { workspaceId, email: null } });
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { inviteLinkEnabled: false },
  });

  return NextResponse.json({ ok: true });
}
