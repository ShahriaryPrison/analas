import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fetchInsightData } from "@/lib/insight-query";
import { hasFeature, type Feature, type Plan } from "@/lib/billing/plans";

const FEATURE_MAP: Record<string, Feature> = {
  retention: "cohort_retention",
  funnel: "funnels",
  metric: "advanced_filters",
  session_recording: "session_recording",
};

export async function GET(
  req: Request,
  context: { params: Promise<{ insightId: string }> }
) {
  const auth = await resolveApiKey(req, { scope: "insights:read" });
  if (auth instanceof NextResponse) return auth;

  const { insightId } = await context.params;

  const insight = await prisma.insight.findFirst({
    where: { id: insightId, dashboard: { workspaceId: auth.workspaceId } },
  });
  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const requiredFeature = FEATURE_MAP[insight.type];
  if (requiredFeature && !hasFeature(auth.plan as Plan, requiredFeature)) {
    return NextResponse.json(
      { error: "This insight type is not available on your current plan. Please upgrade." },
      { status: 403 }
    );
  }

  if (insight.type === "session_recording") {
    const qc = (insight.queryConfig ?? {}) as { pagePath?: string; distinctId?: string };
    const where: NonNullable<Parameters<typeof prisma.sessionRecording.findMany>[0]>["where"] = {
      workspaceId: auth.workspaceId,
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

  const data = await fetchInsightData(
    auth.tenantId,
    insight.type,
    (insight.queryConfig as Record<string, unknown>) ?? {}
  );
  return NextResponse.json(data);
}
