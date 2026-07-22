import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fakeAuth, denied } from "@/test/helpers";
import { GET, POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

function reqWithBody(body: unknown) {
  return new Request("https://analas.test/api/v1/dashboards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/dashboards", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(401));
    const res = await GET(new Request("https://analas.test"));
    expect(res.status).toBe(401);
  });

  it("lists dashboards scoped to the key's own workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine" }));
    vi.mocked(prisma.dashboard.findMany).mockResolvedValue([{ id: "d1", name: "Main" }] as any);

    await GET(new Request("https://analas.test"));

    expect(prisma.dashboard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws_mine" } })
    );
  });
});

describe("POST /api/v1/dashboards", () => {
  it("rejects an empty name", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth());
    const res = await POST(reqWithBody({ name: "  " }));
    expect(res.status).toBe(400);
  });

  it("blocks creation once the plan's dashboard limit is reached", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ plan: "FREE" })); // FREE maxDashboards = 1
    vi.mocked(prisma.dashboard.count).mockResolvedValue(1);

    const res = await POST(reqWithBody({ name: "Second dashboard" }));

    expect(res.status).toBe(403);
    expect(prisma.dashboard.create).not.toHaveBeenCalled();
  });

  it("creates a dashboard scoped to the key's workspace when under the limit", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine", plan: "PRO" }));
    vi.mocked(prisma.dashboard.count).mockResolvedValue(0);
    vi.mocked(prisma.dashboard.create).mockResolvedValue({ id: "d_new", name: "Agent dashboard" } as any);

    const res = await POST(reqWithBody({ name: "Agent dashboard" }));

    expect(prisma.dashboard.create).toHaveBeenCalledWith({
      data: { name: "Agent dashboard", workspaceId: "ws_mine" },
    });
    expect(res.status).toBe(201);
  });
});
