import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

type Params = { params: Promise<{ token: string }> };

/**
 * Canonical app origin: always use NEXTAUTH_URL so that Docker's internal
 * 0.0.0.0 address never leaks into redirect URLs.
 */
function getOrigin(req: NextRequest): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin
  ).replace(/\/$/, "");
}

function errorRedirect(origin: string, reason: string): NextResponse {
  return NextResponse.redirect(`${origin}/invite/error?reason=${reason}`);
}

// ── GET /api/invite/[token] ───────────────────────────────────────────────────
// Resolves a public invite token.
// - Logged in  → join workspace → redirect to workspace
// - Logged out → redirect to /register?invite=[token]
export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const origin = getOrigin(req);

  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });

  if (!invite) {
    return errorRedirect(origin, "invalid");
  }

  if (invite.usedAt && invite.email !== null) {
    // Email invites are single-use
    return errorRedirect(origin, "used");
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return errorRedirect(origin, "expired");
  }

  const session = await getAppSession();

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
    return errorRedirect(origin, "email_mismatch");
  }

  // Check not already a member
  const existing = await prisma.workspaceMember.findFirst({
    where: { workspaceId: invite.workspaceId, userId: user.id },
  });

  if (!existing) {
    const workspace = await prisma.workspace.findUnique({ where: { id: invite.workspaceId } });
    if (workspace) {
      const { getEffectivePlan } = await import("@/lib/billing/plans");
      const planConfig = getEffectivePlan(workspace.plan as any);

      const currentMembersCount = await prisma.workspaceMember.count({
        where: { workspaceId: invite.workspaceId },
      });
      if (currentMembersCount >= planConfig.maxMembers) {
        return errorRedirect(origin, "member_limit");
      }
    }

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
