import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ insightId: string }> }
) {
  const auth = await resolveApiKey(_req, { scope: "insights:read" });
  if (auth instanceof NextResponse) return auth;

  const { insightId } = await context.params;

  const insight = await prisma.insight.findFirst({
    where: { id: insightId, dashboard: { workspaceId: auth.workspaceId } },
    select: {
      id: true,
      name: true,
      type: true,
      queryConfig: true,
      position: true,
      dashboardId: true,
    },
  });

  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ insight });
}
