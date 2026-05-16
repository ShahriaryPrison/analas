import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

type Params = { params: Promise<{ workspaceId: string }> };

/** Helper: resolve session + membership for a workspace. Returns 401/403 on failure. */
async function resolveAccess(workspaceId: string, minRole: "ADMIN" | "OWNER" = "ADMIN") {
  const session = await getAppSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: session.user.email },
    },
    include: { user: true },
  });

  if (!membership) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const rank = { OWNER: 2, ADMIN: 1, MEMBER: 0 } as Record<string, number>;
  if ((rank[membership.role] ?? 0) < (rank[minRole] ?? 0)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, membership };
}

// ── DELETE /api/workspace/[workspaceId]/members?userId=xxx ────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId, "ADMIN");
  if ("error" in result) return result.error;
  const { membership: actor } = result;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const target = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 403 });
  }
  // ADMIN cannot remove another ADMIN — only OWNER can
  if (actor.role === "ADMIN" && target.role === "ADMIN") {
    return NextResponse.json({ error: "Admins cannot remove other admins" }, { status: 403 });
  }

  await prisma.workspaceMember.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}

// ── PATCH /api/workspace/[workspaceId]/members ───────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;
  const result = await resolveAccess(workspaceId, "ADMIN");
  if ("error" in result) return result.error;

  const { userId, role } = await req.json();
  if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

  const ALLOWED_ROLES = ["MEMBER", "ADMIN"];
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Allowed: MEMBER, ADMIN" },
      { status: 400 }
    );
  }

  const target = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 403 });
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: target.id },
    data: { role },
  });

  return NextResponse.json({ id: updated.id, role: updated.role });
}
