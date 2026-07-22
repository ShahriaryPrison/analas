import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fakeAuth, denied } from "@/test/helpers";
import { POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

function reqWithBody(body: unknown) {
  return new Request("https://analas.test/api/v1/insights", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/v1/insights", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(403));
    const res = await POST(reqWithBody({ name: "x", type: "count", queryConfig: { eventName: "y" } }));
    expect(res.status).toBe(403);
  });

  it("rejects a request with no name or empty queryConfig", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth());
    const res = await POST(reqWithBody({ name: "", type: "count", queryConfig: {} }));
    expect(res.status).toBe(400);
  });

  it("blocks a plan-gated insight type on a FREE workspace before touching the dashboard", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ plan: "FREE" }));

    const res = await POST(
      reqWithBody({ name: "Funnel", type: "funnel", queryConfig: { eventSteps: "a,b" } })
    );

    expect(res.status).toBe(403);
    expect(prisma.dashboard.findMany).not.toHaveBeenCalled();
  });

  it("404s when an explicit dashboardId doesn't belong to the key's workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine" }));
    vi.mocked(prisma.dashboard.findMany).mockResolvedValue([{ id: "ws_mine_dash" }] as any);

    const res = await POST(
      reqWithBody({
        name: "x",
        type: "count",
        queryConfig: { eventName: "y" },
        dashboardId: "someone_elses_dashboard",
      })
    );

    expect(res.status).toBe(404);
  });

  it("creates the insight on the key's own dashboard, scoped by workspaceId", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine" }));
    vi.mocked(prisma.dashboard.findMany).mockResolvedValue([{ id: "dash_1" }] as any);
    vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.insight.create).mockResolvedValue({ id: "ins_new", name: "x" } as any);

    const res = await POST(reqWithBody({ name: "x", type: "count", queryConfig: { eventName: "y" } }));

    expect(prisma.dashboard.findMany).toHaveBeenCalledWith({ where: { workspaceId: "ws_mine" } });
    expect(prisma.insight.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dashboardId: "dash_1", position: 1 }) })
    );
    expect(res.status).toBe(201);
  });

  it("auto-creates a 'Main dashboard' when the workspace has none yet", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine", plan: "FREE" }));
    vi.mocked(prisma.dashboard.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dashboard.create).mockResolvedValue({ id: "dash_auto", name: "Main dashboard" } as any);
    vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.insight.create).mockResolvedValue({ id: "ins_new" } as any);

    const res = await POST(reqWithBody({ name: "x", type: "count", queryConfig: { eventName: "y" } }));

    expect(prisma.dashboard.create).toHaveBeenCalledWith({
      data: { name: "Main dashboard", workspaceId: "ws_mine" },
    });
    expect(res.status).toBe(201);
  });
});
