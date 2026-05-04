import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function OldSettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: { include: { workspace: true } } },
  });
  const workspaceId = user?.workspaces?.[0]?.workspace?.id;
  if (!workspaceId) redirect("/dashboard");

  redirect(`/workspace/${workspaceId}/settings`);
}
