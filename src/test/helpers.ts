import { NextResponse } from "next/server";
import type { ResolvedApiKey } from "@/lib/api-auth";

export function fakeAuth(overrides: Partial<ResolvedApiKey> = {}): ResolvedApiKey {
  return {
    tenantId: "tenant_1",
    workspaceId: "ws_1",
    plan: "PRO",
    allowedDomains: [],
    ...overrides,
  };
}

export function denied(status = 403) {
  return NextResponse.json({ error: "denied" }, { status });
}

export function paramsOf<T extends object>(params: T) {
  return { params: Promise.resolve(params) };
}
