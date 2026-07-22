import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan, type Plan } from "@/lib/billing/plans";

export async function GET(req: Request) {
  const auth = await resolveApiKey(req, { scope: "dashboards:read" });
  if (auth instanceof NextResponse) return auth;

  const dashboards = await prisma.dashboard.findMany({
    where: { workspaceId: auth.workspaceId },
    select: { id: true, name: true, isPublic: true, insights: { select: { id: true, name: true, type: true } } },
  });

  return NextResponse.json({ dashboards });
}

export async function POST(req: Request) {
  const auth = await resolveApiKey(req, { scope: "dashboards:write" });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const currentDashboardsCount = await prisma.dashboard.count({
    where: { workspaceId: auth.workspaceId },
  });
  const planConfig = getEffectivePlan(auth.plan as Plan);
  if (currentDashboardsCount >= planConfig.maxDashboards) {
    return NextResponse.json(
      {
        error: `You have reached the maximum number of dashboards allowed on your ${planConfig.name} plan (${planConfig.maxDashboards}). Please upgrade.`,
      },
      { status: 403 }
    );
  }

  const dashboard = await prisma.dashboard.create({
    data: { name, workspaceId: auth.workspaceId },
  });

  return NextResponse.json({ dashboard }, { status: 201 });
}
