import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

type Params = { params: Promise<{ workspaceId: string }> };

// ── POST /api/workspace/[workspaceId]/members/leave ───────────────────────────
// Server-side guard: OWNER cannot leave their workspace.
export async function POST(_req: NextRequest, { params }: Params) {
  const { workspaceId } = await params;

  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: session.user.email },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this workspace" }, { status: 403 });
  }

  if (membership.role === "OWNER") {
    return NextResponse.json(
      { error: "The workspace owner cannot leave. Transfer ownership or delete the workspace." },
      { status: 403 }
    );
  }

  await prisma.workspaceMember.delete({ where: { id: membership.id } });
  return NextResponse.json({ ok: true });
}
