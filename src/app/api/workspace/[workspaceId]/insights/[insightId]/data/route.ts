import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { fetchInsightData } from "@/lib/insight-query";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
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

  // ── Session Recording: served from Postgres, not ClickHouse ─────────────
  if (insight.type === "session_recording") {
    const qc = (insight.queryConfig ?? {}) as { pagePath?: string; distinctId?: string };

    const where: NonNullable<
      Parameters<typeof prisma.sessionRecording.findMany>[0]
    >["where"] = {
      workspaceId,
    };
    if (qc.pagePath?.trim()) where.pagePath = qc.pagePath.trim();
    if (qc.distinctId?.trim()) where.distinctId = qc.distinctId.trim();

    const TAKE = 50;
    const cursor = new URL(req.url).searchParams.get("cursor");

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

  // ── All other types: ClickHouse via fetchInsightData ─────────────────────
  const tenantId = insight.dashboard.workspace.tenantId;
  const data = await fetchInsightData(
    tenantId,
    insight.type,
    (insight.queryConfig as Record<string, unknown>) ?? {}
  );

  return NextResponse.json(data);
}
