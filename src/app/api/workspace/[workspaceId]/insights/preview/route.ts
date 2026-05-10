import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { fetchInsightData } from "@/lib/insight-query";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await context.params;
  const body = await req.json();
  const { type, queryConfig } = body;

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { user: { email: session.user.email } } },
    },
  });

  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await fetchInsightData(
    workspace.tenantId,
    type,
    queryConfig || {}
  );

  return NextResponse.json(data);
}
