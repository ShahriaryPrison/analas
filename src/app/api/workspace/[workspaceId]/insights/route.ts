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
  const requestedDashboardId = body?.dashboardId ? String(body.dashboardId).trim() : null;

  if (!name || Object.keys(queryConfig).length === 0) {
    return NextResponse.json({ error: "Name and configuration are required" }, { status: 400 });
  }

  // Feature Enforcement
  const { hasFeature } = await import("@/lib/billing/plans");
  let requiredFeature: any = "basic_insights";
  if (type === "retention") requiredFeature = "cohort_retention";
  if (type === "funnel") requiredFeature = "funnels";
  if (type === "metric") requiredFeature = "advanced_filters";

  if (!hasFeature(workspace.plan, requiredFeature)) {
    return NextResponse.json({ 
      error: `Your current plan does not support ${type} insights. Please upgrade.` 
    }, { status: 403 });
  }

  let dashboard = requestedDashboardId
    ? workspace.dashboards.find((d) => d.id === requestedDashboardId)
    : workspace.dashboards[0];

  if (!dashboard) {
    if (requestedDashboardId) {
      return NextResponse.json({ error: "Dashboard not found in this workspace" }, { status: 404 });
    }
    dashboard = await prisma.dashboard.create({
      data: {
        name: "Main dashboard",
        workspaceId: workspace.id,
      },
    });
  }

  const lastInsight = await prisma.insight.findFirst({
    where: { dashboardId: dashboard.id },
    orderBy: { position: "desc" },
  });
  const newPosition = (lastInsight?.position ?? 0) + 1;

  const insight = await prisma.insight.create({
    data: {
      name,
      type,
      queryConfig,
      position: newPosition,
      dashboardId: dashboard.id,
    },
  });

  return NextResponse.json({ insight }, { status: 201 });
}
