import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
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
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // 1. Resolve limits
    const currentDashboardsCount = await prisma.dashboard.count({
      where: { workspaceId },
    });

    const { getEffectivePlan } = await import("@/lib/billing/plans");
    const planConfig = getEffectivePlan(workspace.plan as any);

    if (currentDashboardsCount >= planConfig.maxDashboards) {
      return NextResponse.json(
        {
          error: `You have reached the maximum number of dashboards allowed on your ${planConfig.name} plan (${planConfig.maxDashboards}). Please upgrade.`,
        },
        { status: 403 }
      );
    }

    // 2. Create the dashboard
    const dashboard = await prisma.dashboard.create({
      data: {
        name,
        workspaceId,
      },
    });

    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (err) {
    console.error("Failed to create dashboard:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
