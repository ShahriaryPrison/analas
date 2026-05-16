import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function getAuthorizedWorkspace(workspaceId: string) {
  const session = await getAppSession();
  if (!session) redirect("/login");

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
