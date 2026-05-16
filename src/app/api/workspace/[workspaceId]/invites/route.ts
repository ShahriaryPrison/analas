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

// ── GET — list pending invites ────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId);
  if ("error" in result) return result.error;

  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId, usedAt: null, email: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}

// ── POST — create invite ───────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId);
  if ("error" in result) return result.error;

  const { email, role = "MEMBER" } = await req.json();

  const ALLOWED_ROLES = ["MEMBER", "ADMIN"];
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email: normalizedEmail } },
  });
  if (existingMember) {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  // Check for existing pending invite for this email
  const existingInvite = await prisma.workspaceInvite.findFirst({
    where: { workspaceId, email: normalizedEmail, usedAt: null },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "An invite for this email already exists" }, { status: 409 });
  }

  // If the email already has an account → add immediately
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: existingUser.id, role },
      include: { user: true },
    });
    return NextResponse.json({
      status: "added",
      member: { id: member.userId, email: member.user.email, name: member.user.name, role: member.role },
    }, { status: 201 });
  }

  // No account yet → create pending invite
  const token = crypto.randomBytes(24).toString("base64url");
  const invite = await prisma.workspaceInvite.create({
    data: { token, email: normalizedEmail, role, workspaceId },
  });

  return NextResponse.json({ status: "pending", invite }, { status: 201 });
}

// ── DELETE — revoke invite ?inviteId=xxx ──────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId);
  if ("error" in result) return result.error;

  const inviteId = req.nextUrl.searchParams.get("inviteId");
  if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 });

  const invite = await prisma.workspaceInvite.findFirst({
    where: { id: inviteId, workspaceId, usedAt: null },
  });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  await prisma.workspaceInvite.delete({ where: { id: inviteId } });
  return NextResponse.json({ ok: true });
}
