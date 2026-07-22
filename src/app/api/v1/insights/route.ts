import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hasFeature, getEffectivePlan, type Feature, type Plan } from "@/lib/billing/plans";

const FEATURE_MAP: Record<string, Feature> = {
  retention: "cohort_retention",
  funnel: "funnels",
  metric: "advanced_filters",
  session_recording: "session_recording",
};

export async function POST(req: Request) {
  const auth = await resolveApiKey(req, { scope: "insights:write" });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const type = String(body?.type ?? "count").trim();
  const queryConfig = body?.queryConfig && typeof body.queryConfig === "object" ? body.queryConfig : {};
  const requestedDashboardId = body?.dashboardId ? String(body.dashboardId).trim() : null;

  if (!name || Object.keys(queryConfig).length === 0) {
    return NextResponse.json({ error: "Name and configuration are required" }, { status: 400 });
  }

  const requiredFeature = FEATURE_MAP[type] ?? "basic_insights";
  if (!hasFeature(auth.plan as Plan, requiredFeature)) {
    return NextResponse.json(
      { error: `Your current plan does not support ${type} insights. Please upgrade.` },
      { status: 403 }
    );
  }

  const dashboards = await prisma.dashboard.findMany({ where: { workspaceId: auth.workspaceId } });

  let dashboard = requestedDashboardId
    ? dashboards.find((d) => d.id === requestedDashboardId)
    : dashboards[0];

  if (!dashboard) {
    if (requestedDashboardId) {
      return NextResponse.json({ error: "Dashboard not found in this workspace" }, { status: 404 });
    }
    const planConfig = getEffectivePlan(auth.plan as Plan);
    if (dashboards.length >= planConfig.maxDashboards) {
      return NextResponse.json(
        { error: `You have reached the maximum number of dashboards allowed on your ${planConfig.name} plan (${planConfig.maxDashboards}). Please upgrade.` },
        { status: 403 }
      );
    }
    dashboard = await prisma.dashboard.create({
      data: { name: "Main dashboard", workspaceId: auth.workspaceId },
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
