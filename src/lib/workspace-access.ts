import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function getAuthorizedWorkspace(workspaceId: string) {
  const session = await getAppSession();
  if (!session) redirect("/login");

  // Verification Gate: At least one of email or phone must be verified
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { emailVerified: true, phoneVerified: true, phone: true },
  });

  if (!dbUser || (!dbUser.emailVerified && !dbUser.phoneVerified)) {
    redirect(`/verify?email=${encodeURIComponent(session.user.email)}&phone=${encodeURIComponent(dbUser?.phone || "")}`);
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { user: { email: session.user.email } } },
    },
    include: {
      apiKeys: true,
      members: { include: { user: true } },
      dashboards: { include: { insights: true } },
      invites: { where: { usedAt: null } },
    },
  });

  if (!workspace) redirect("/dashboard");

  const membership = workspace.members.find(
    (m) => m.user.email === session.user.email
  );

  return { workspace, membership, session };
}

/**
 * Like getAuthorizedWorkspace but also blocks MEMBER role from accessing
 * admin-only pages (settings). Redirects MEMBER to their captures page.
 */
export async function requireAdminAccess(workspaceId: string) {
  const { workspace, membership, session } =
    await getAuthorizedWorkspace(workspaceId);

  if (!membership || membership.role === "MEMBER") {
    redirect(`/workspace/${workspaceId}/captures`);
  }

  return { workspace, membership, session };
}
