import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { user: { email: session.user.email } } },
    },
    include: { dashboards: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const type = String(body?.type ?? "count").trim();
  const queryConfig = body?.queryConfig && typeof body.queryConfig === "object" ? body.queryConfig : {};

  if (!name || Object.keys(queryConfig).length === 0) {
    return NextResponse.json({ error: "Name and configuration are required" }, { status: 400 });
  }

  let dashboard = workspace.dashboards[0];
  if (!dashboard) {
    dashboard = await prisma.dashboard.create({
      data: {
        name: "Main dashboard",
        workspaceId: workspace.id,
      },
    });
  }

  const insight = await prisma.insight.create({
    data: {
      name,
      type,
      queryConfig,
      dashboardId: dashboard.id,
    },
  });

  return NextResponse.json({ insight }, { status: 201 });
}
