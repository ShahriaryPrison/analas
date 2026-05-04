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
    },
  });

  if (!workspace) redirect("/dashboard");

  const membership = workspace.members.find(
    (m) => m.user.email === session.user.email
  );

  return { workspace, membership, session };
}
