import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-auth";
import { fetchInsightData } from "@/lib/insight-query";
import { hasFeature, type Feature, type Plan } from "@/lib/billing/plans";

const FEATURE_MAP: Record<string, Feature> = {
  retention: "cohort_retention",
  funnel: "funnels",
  metric: "advanced_filters",
  session_recording: "session_recording",
};

export async function POST(req: Request) {
  const auth = await resolveApiKey(req, { scope: "insights:read" });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const type = String(body?.type ?? "").trim();
  const queryConfig = body?.queryConfig && typeof body.queryConfig === "object" ? body.queryConfig : {};

  if (!type) {
    return NextResponse.json({ error: "'type' is required" }, { status: 400 });
  }

  const requiredFeature = FEATURE_MAP[type] ?? "basic_insights";
  if (!hasFeature(auth.plan as Plan, requiredFeature)) {
    return NextResponse.json(
      { error: `Your current plan does not support ${type} insights. Please upgrade.` },
      { status: 403 }
    );
  }

  const data = await fetchInsightData(auth.tenantId, type, queryConfig);
  return NextResponse.json(data);
}
