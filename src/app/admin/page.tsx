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

  // Fetch the admin user record from the database to check verification status
  const dbAdmin = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbAdmin || !dbAdmin.emailVerified) {
    redirect("/dashboard");
  }

  // Fetch workspaces with all of their members
  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
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
    members: w.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name ?? "No Name",
      email: m.user.email,
      phone: m.user.phone ?? "",
      role: m.role,
      emailVerified: !!m.user.emailVerified,
      phoneVerified: !!m.user.phoneVerified,
    })),
  }));

  // Fetch all users with their workspaces and roles
  const users = await prisma.user.findMany({
    include: {
      workspaces: {
        include: { workspace: true },
      },
    },
    orderBy: { email: "asc" },
  });

  const formattedUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone ?? "",
    name: u.name ?? "No Name",
    emailVerified: !!u.emailVerified,
    phoneVerified: !!u.phoneVerified,
    workspaces: u.workspaces.map((w) => ({
      workspaceId: w.workspace.id,
      name: w.workspace.name,
      role: w.role,
    })),
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminClient initialWorkspaces={formattedWorkspaces} initialUsers={formattedUsers} />
    </div>
  );
}

