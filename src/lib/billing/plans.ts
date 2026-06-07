export type Plan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export type Feature = "basic_insights" | "cohort_retention" | "funnels" | "advanced_filters" | "public_dashboards";

export interface PlanConfig {
  name: string;
  price: string;
  priceId?: string | number;
  description: string;
  maxEventsPerMonth: number;
  maxDashboards: number;
  maxMembers: number;
  dataRetentionDays: number;
  features: Feature[];
}

import plansData from "./billing-plans.json";

export const PLAN_LIMITS: Record<Plan, PlanConfig> = plansData as Record<Plan, PlanConfig>;

/**
 * Helper to check if the workspace is cloud hosted or self-hosted.
 * In a self-hosted scenario (IS_CLOUD_HOSTED !== 'true'), we typically bypass limits
 * or give everyone ENTERPRISE by default, based on the Plausible model.
 */
export function isCloudHosted(): boolean {
  return process.env.NEXT_PUBLIC_IS_CLOUD_HOSTED === "true";
}

/**
 * Determines the effective plan for a workspace.
 * If self-hosted, they get Enterprise limits for free.
 */
export function getEffectivePlan(dbPlan: Plan): PlanConfig {
  if (!isCloudHosted()) {
    return PLAN_LIMITS.ENTERPRISE;
  }
  return PLAN_LIMITS[dbPlan];
}

/**
 * Checks if a specific feature is allowed for a given plan.
 */
export function hasFeature(dbPlan: Plan, feature: Feature): boolean {
  const planConfig = getEffectivePlan(dbPlan);
  return planConfig.features.includes(feature);
}
