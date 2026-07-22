import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ dashboardId: string }> }
) {
  const auth = await resolveApiKey(req, { scope: "dashboards:read" });
  if (auth instanceof NextResponse) return auth;

  const { dashboardId } = await context.params;

  const dashboard = await prisma.dashboard.findFirst({
    where: { id: dashboardId, workspaceId: auth.workspaceId },
    select: {
      id: true,
      name: true,
      isPublic: true,
      insights: {
        select: { id: true, name: true, type: true, queryConfig: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ dashboard });
}
