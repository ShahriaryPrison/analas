import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

type Params = { params: Promise<{ token: string }> };

// ── GET /api/invite/[token] ───────────────────────────────────────────────────
// Resolves a public invite token.
// - Logged in  → join workspace → redirect to workspace
// - Logged out → redirect to /register?invite=[token]
export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.usedAt && invite.email !== null) {
    // Email invites are single-use
    return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  const session = await getAppSession();
  const origin = req.nextUrl.origin;

  if (!session) {
    return NextResponse.redirect(`${origin}/register?invite=${token}`);
  }

  // Logged in — join workspace
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.redirect(`${origin}/login?invite=${token}`);
  }

  // Email-specific invite: validate the email matches
  if (invite.email && invite.email !== user.email) {
    return NextResponse.json(
      { error: "This invite was sent to a different email address" },
      { status: 403 }
    );
  }

  // Check not already a member
  const existing = await prisma.workspaceMember.findFirst({
    where: { workspaceId: invite.workspaceId, userId: user.id },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
      }),
      // Mark email invites as used; public links (email=null) stay active
      ...(invite.email
        ? [prisma.workspaceInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } })]
        : []),
    ]);
  }

  return NextResponse.redirect(`${origin}/workspace/${invite.workspaceId}/captures`);
}
