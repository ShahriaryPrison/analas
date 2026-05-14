import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthorizedWorkspace } from "@/lib/workspace-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; insightId: string }> }
) {
  try {
    const { workspaceId, insightId } = await params;
    await getAuthorizedWorkspace(workspaceId);

    const { direction } = await req.json();
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    // 1. Get current insight
    const currentInsight = await prisma.insight.findUnique({
      where: { id: insightId },
    });

    if (!currentInsight) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 2. Self-healing: if position is 0, initialize all insights for this dashboard
    if (currentInsight.position === 0) {
      const allInsights = await prisma.insight.findMany({
        where: { dashboardId: currentInsight.dashboardId },
        orderBy: { id: "asc" },
      });
      
      let newPosition = 1;
      for (const ins of allInsights) {
        await prisma.insight.update({
          where: { id: ins.id },
          data: { position: newPosition },
        });
        if (ins.id === currentInsight.id) {
          currentInsight.position = newPosition;
        }
        newPosition++;
      }
    }

    // 3. Find the neighbor to swap with
    const neighbor = await prisma.insight.findFirst({
      where: {
        dashboardId: currentInsight.dashboardId,
        position: direction === "down" 
          ? { gt: currentInsight.position } 
          : { lt: currentInsight.position },
      },
      orderBy: {
        position: direction === "down" ? "asc" : "desc",
      },
    });

    // If no neighbor, we are already at the boundary
    if (!neighbor) {
      return NextResponse.json({ success: true, swapped: false });
    }

    // 3. Swap positions using a transaction
    await prisma.$transaction([
      prisma.insight.update({
        where: { id: currentInsight.id },
        data: { position: neighbor.position },
      }),
      prisma.insight.update({
        where: { id: neighbor.id },
        data: { position: currentInsight.position },
      }),
    ]);

    return NextResponse.json({ success: true, swapped: true });
  } catch (error) {
    console.error("Move insight error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
