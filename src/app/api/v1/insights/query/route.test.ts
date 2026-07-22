import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import * as insightQuery from "@/lib/insight-query";
import { fakeAuth, denied } from "@/test/helpers";
import { POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

function reqWithBody(body: unknown) {
  return new Request("https://analas.test/api/v1/insights/query", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/v1/insights/query", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(403));
    const res = await POST(reqWithBody({ type: "count" }));
    expect(res.status).toBe(403);
  });

  it("rejects a request with no type", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth());
    const res = await POST(reqWithBody({}));
    expect(res.status).toBe(400);
  });

  it("blocks a plan-gated insight type on a FREE workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ plan: "FREE" }));
    const spy = vi.spyOn(insightQuery, "fetchInsightData");

    const res = await POST(reqWithBody({ type: "funnel", queryConfig: {} }));

    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("runs the query scoped to the key's tenant for an allowed type", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ tenantId: "tenant_9", plan: "PRO" }));
    vi.spyOn(insightQuery, "fetchInsightData").mockResolvedValue({ total: 5, rows: [] });

    const res = await POST(reqWithBody({ type: "count", queryConfig: { eventName: "signup" } }));
    const body = await res.json();

    expect(insightQuery.fetchInsightData).toHaveBeenCalledWith("tenant_9", "count", { eventName: "signup" });
    expect(body).toEqual({ total: 5, rows: [] });
  });
});
