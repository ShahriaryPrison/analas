import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { fetchInsightData } from "@/lib/insight-query";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; insightId: string }> }
) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, insightId } = await context.params;

  const insight = await prisma.insight.findFirst({
    where: {
      id: insightId,
      dashboard: {
        workspace: {
          id: workspaceId,
          members: { some: { user: { email: session.user.email } } },
        },
      },
    },
    include: { dashboard: { include: { workspace: true } } },
  });

  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenantId = insight.dashboard.workspace.tenantId;
  const data = await fetchInsightData(
    tenantId,
    insight.type,
    (insight.queryConfig as Record<string, unknown>) ?? {}
  );

  return NextResponse.json(data);
}
