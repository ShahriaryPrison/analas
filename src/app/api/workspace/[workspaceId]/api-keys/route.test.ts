import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { paramsOf } from "@/test/helpers";
import { POST, GET } from "./route";

vi.mock("@/lib/session", () => ({ getAppSession: vi.fn() }));

function reqWithBody(body: unknown) {
  return new Request("https://analas.test/api/workspace/ws_1/api-keys", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const session = { user: { email: "owner@acme.com" } };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/workspace/:workspaceId/api-keys", () => {
  it("rejects an unauthenticated request", async () => {
    vi.mocked(getAppSession).mockResolvedValue(null);
    const res = await POST(reqWithBody({}), paramsOf({ workspaceId: "ws_1" }));
    expect(res.status).toBe(401);
  });

  it("rejects a caller who isn't a member of the workspace", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null);

    const res = await POST(reqWithBody({}), paramsOf({ workspaceId: "ws_1" }));
    expect(res.status).toBe(403);
  });

  it("defaults to events:write when no scopes are requested, preserving existing key behavior", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({} as any);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: "k1",
      name: "Key",
      scopes: ["events:write"],
    } as any);

    await POST(reqWithBody({}), paramsOf({ workspaceId: "ws_1" }));

    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ scopes: ["events:write"] }) })
    );
  });

  it("silently drops unknown scope strings instead of persisting them", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({} as any);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: "k1",
      name: "Key",
      scopes: ["insights:read"],
    } as any);

    await POST(reqWithBody({ scopes: ["insights:read", "sudo:everything"] }), paramsOf({ workspaceId: "ws_1" }));

    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ scopes: ["insights:read"] }) })
    );
  });

  it("rejects the request when every requested scope is invalid", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({} as any);

    const res = await POST(reqWithBody({ scopes: ["sudo:everything"] }), paramsOf({ workspaceId: "ws_1" }));

    expect(res.status).toBe(400);
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/workspace/:workspaceId/api-keys", () => {
  it("returns each key's scopes alongside its name", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspace: { apiKeys: [{ id: "k1", name: "Key", scopes: ["events:read"], createdAt: new Date() }] },
    } as any);

    const res = await GET(new Request("https://analas.test"), paramsOf({ workspaceId: "ws_1" }));
    const body = await res.json();

    expect(body.apiKeys[0].scopes).toEqual(["events:read"]);
  });
});
