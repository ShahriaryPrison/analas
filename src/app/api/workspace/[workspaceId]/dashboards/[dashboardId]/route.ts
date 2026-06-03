import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ workspaceId: string; dashboardId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, dashboardId } = await params;

    // Check workspace authorization
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

    // Update the dashboard
    const dashboard = await prisma.dashboard.update({
      where: { id: dashboardId, workspaceId },
      data: { name },
    });

    return NextResponse.json({ dashboard });
  } catch (err) {
    console.error("Failed to rename dashboard:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, dashboardId } = await params;

    // Check workspace authorization
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

    // Ensure it exists in this workspace
    const dashboardExists = workspace.dashboards.some((d) => d.id === dashboardId);
    if (!dashboardExists) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    // Ensure it is not the last remaining dashboard
    if (workspace.dashboards.length <= 1) {
      return NextResponse.json(
        { error: "A workspace must have at least one dashboard." },
        { status: 400 }
      );
    }

    // Perform cascade delete inside transaction
    await prisma.$transaction([
      prisma.insight.deleteMany({
        where: { dashboardId },
      }),
      prisma.dashboard.delete({
        where: { id: dashboardId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete dashboard:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
