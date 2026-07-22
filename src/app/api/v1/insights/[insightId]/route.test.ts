import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fakeAuth, denied, paramsOf } from "@/test/helpers";
import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/insights/:insightId", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(401));
    const res = await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_1" }));
    expect(res.status).toBe(401);
  });

  it("scopes the lookup to the key's own workspace, not a workspace from the request", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine" }));
    vi.mocked(prisma.insight.findFirst).mockResolvedValue({ id: "ins_1", name: "x" } as any);

    await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_1" }));

    expect(prisma.insight.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ins_1", dashboard: { workspaceId: "ws_mine" } },
      })
    );
  });

  it("returns 404 for an insight that belongs to another tenant's workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine" }));
    // The Prisma where-clause already excludes other workspaces, so a cross-tenant
    // lookup resolves to null rather than leaking someone else's insight.
    vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);

    const res = await GET(new Request("https://analas.test"), paramsOf({ insightId: "ins_other_tenant" }));

    expect(res.status).toBe(404);
  });
});
