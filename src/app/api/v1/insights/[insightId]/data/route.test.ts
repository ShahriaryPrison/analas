import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import * as insightQuery from "@/lib/insight-query";
import { fakeAuth, denied, paramsOf } from "@/test/helpers";
import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/insights/:insightId/data", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(401));
    const res = await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the insight isn't found in the key's workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth());
    vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);

    const res = await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_missing" }));
    expect(res.status).toBe(404);
  });

  it("blocks a plan-gated insight type even when reading by id", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ plan: "FREE" }));
    vi.mocked(prisma.insight.findFirst).mockResolvedValue({
      id: "ins_1",
      type: "funnel",
      queryConfig: {},
    } as any);

    const res = await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_1" }));
    expect(res.status).toBe(403);
  });

  it("serves session_recording insights from Postgres, scoped to the key's workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine", plan: "PRO" }));
    vi.mocked(prisma.insight.findFirst).mockResolvedValue({
      id: "ins_1",
      type: "session_recording",
      queryConfig: { pagePath: "/checkout" },
    } as any);
    vi.mocked(prisma.sessionRecording.count).mockResolvedValue(2);
    vi.mocked(prisma.sessionRecording.findMany).mockResolvedValue([
      { id: "rec_1", createdAt: new Date("2026-01-01") },
    ] as any);

    const res = await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_1" }));
    const body = await res.json();

    expect(prisma.sessionRecording.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ workspaceId: "ws_mine", pagePath: "/checkout" }) })
    );
    expect(body.total).toBe(2);
    expect(body.rows[0].id).toBe("rec_1");
  });

  it("runs fetchInsightData scoped to the key's tenant for non-recording types", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ tenantId: "tenant_9", plan: "PRO" }));
    vi.mocked(prisma.insight.findFirst).mockResolvedValue({
      id: "ins_1",
      type: "trend",
      queryConfig: { eventName: "signup" },
    } as any);
    vi.spyOn(insightQuery, "fetchInsightData").mockResolvedValue({ total: 3, rows: [] });

    const res = await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_1" }));
    const body = await res.json();

    expect(insightQuery.fetchInsightData).toHaveBeenCalledWith("tenant_9", "trend", { eventName: "signup" });
    expect(body).toEqual({ total: 3, rows: [] });
  });
});
