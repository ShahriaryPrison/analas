import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardClient from "../dashboard-client";

async function DashboardServer() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaces: {
        include: {
          workspace: {
            include: { apiKeys: true, members: { include: { user: true } } },
          },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const workspaces = user.workspaces.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
    tenantId: membership.workspace.tenantId,
    plan: membership.workspace.plan,
    role: membership.role,
    apiKeyCount: membership.workspace.apiKeys.length,
    memberCount: membership.workspace.members.length,
    workspace: membership.workspace,
  }));

  return <DashboardClient workspaces={workspaces} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading…</div>}>
      <DashboardServer />
    </Suspense>
  );
}
