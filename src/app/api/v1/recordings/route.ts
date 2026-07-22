import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hasFeature, type Plan } from "@/lib/billing/plans";

export async function GET(req: Request) {
  const auth = await resolveApiKey(req, { scope: "recordings:read" });
  if (auth instanceof NextResponse) return auth;

  if (!hasFeature(auth.plan as Plan, "session_recording")) {
    return NextResponse.json(
      { error: "Session Recording is not available on your current plan. Please upgrade." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const pagePath = url.searchParams.get("pagePath");
  const distinctId = url.searchParams.get("distinctId");
  const cursor = url.searchParams.get("cursor");

  const where: NonNullable<Parameters<typeof prisma.sessionRecording.findMany>[0]>["where"] = {
    workspaceId: auth.workspaceId,
  };
  if (pagePath?.trim()) where.pagePath = { contains: pagePath.trim(), mode: "insensitive" };
  if (distinctId?.trim()) where.distinctId = { contains: distinctId.trim(), mode: "insensitive" };

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
