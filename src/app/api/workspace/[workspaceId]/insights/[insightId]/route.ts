import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; insightId: string }> }
) {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  });

  if (!insight) {
    return NextResponse.json({ error: "Insight not found" }, { status: 404 });
  }

  await prisma.insight.delete({ where: { id: insightId } });

  return NextResponse.json({ ok: true });
}
