import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";

async function getOwnedInsight(workspaceId: string, insightId: string, email: string) {
  return prisma.insight.findFirst({
    where: {
      id: insightId,
      dashboard: {
        workspace: {
          id: workspaceId,
          members: { some: { user: { email } } },
        },
      },
    },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string; insightId: string }> }
) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, insightId } = await context.params;
  const insight = await getOwnedInsight(workspaceId, insightId, session.user.email);
  if (!insight) return NextResponse.json({ error: "Insight not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = body?.name ? String(body.name).trim() : undefined;
  const queryConfig =
    body?.queryConfig && typeof body.queryConfig === "object" ? body.queryConfig : undefined;

  if (!name && !queryConfig) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.insight.update({
    where: { id: insightId },
    data: {
      ...(name ? { name } : {}),
      ...(queryConfig ? { queryConfig } : {}),
    },
  });

  return NextResponse.json({ insight: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; insightId: string }> }
) {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, insightId } = await context.params;
  const insight = await getOwnedInsight(workspaceId, insightId, session.user.email);

  if (!insight) {
    return NextResponse.json({ error: "Insight not found" }, { status: 404 });
  }

  await prisma.insight.delete({ where: { id: insightId } });

  return NextResponse.json({ ok: true });
}
