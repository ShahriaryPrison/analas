import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fakeAuth, denied, paramsOf } from "@/test/helpers";
import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/dashboards/:dashboardId", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(401));
    const res = await GET(new Request("https://analas.test"), paramsOf({ dashboardId: "d1" }));
    expect(res.status).toBe(401);
  });

  it("scopes the lookup to the key's own workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine" }));
    vi.mocked(prisma.dashboard.findFirst).mockResolvedValue({ id: "d1", name: "Main", insights: [] } as any);

    await GET(new Request("https://analas.test"), paramsOf({ dashboardId: "d1" }));

    expect(prisma.dashboard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "d1", workspaceId: "ws_mine" } })
    );
  });

  it("returns 404 for a dashboard belonging to another tenant", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine" }));
    vi.mocked(prisma.dashboard.findFirst).mockResolvedValue(null);

    const res = await GET(new Request("https://analas.test"), paramsOf({ dashboardId: "d_other_tenant" }));
    expect(res.status).toBe(404);
  });
});
