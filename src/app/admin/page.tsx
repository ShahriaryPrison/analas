import { getAppSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "./admin-client";
import { isAdmin } from "@/lib/auth-admin";

export default async function AdminPage() {
  const session = await getAppSession();
  
  if (!session || !isAdmin(session.user?.email)) {
    redirect("/dashboard");
  }

  // Fetch workspaces with their owners
  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        where: { role: "OWNER" },
        include: { user: true },
      },
    },
  });

  const formattedWorkspaces = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    tenantId: w.tenantId,
    plan: w.plan,
    currentMonthEvents: w.currentMonthEvents,
    ownerEmail: w.members[0]?.user.email ?? "No Owner",
    ownerName: w.members[0]?.user.name ?? "No Name",
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminClient initialWorkspaces={formattedWorkspaces} />
    </div>
  );
}
