import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  // 1. Authorize workspace access
  try {
    await getAuthorizedWorkspace(workspaceId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse query filters (pagePath, distinctId, cursor)
  const url = new URL(req.url);
  const pagePath = url.searchParams.get("pagePath");
  const distinctId = url.searchParams.get("distinctId");
  const cursor = url.searchParams.get("cursor");

  const where: NonNullable<
    Parameters<typeof prisma.sessionRecording.findMany>[0]
  >["where"] = {
    workspaceId,
  };

  if (pagePath?.trim()) {
    where.pagePath = { contains: pagePath.trim(), mode: "insensitive" };
  }
  if (distinctId?.trim()) {
    where.distinctId = { contains: distinctId.trim(), mode: "insensitive" };
  }

  const TAKE = 50;

  const [total, rows] = await Promise.all([
    prisma.sessionRecording.count({ where }),
    prisma.sessionRecording.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: TAKE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        distinctId: true,
        duration: true,
        browser: true,
        os: true,
        pagePath: true,
        chunkCount: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    total,
    rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    nextCursor: rows.length === TAKE ? rows[rows.length - 1].id : null,
  });
}
