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
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspace: { id: "ws_1", tenantId: "tenant_abc123" },
    } as any);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: "k1",
      name: "Key",
      scopes: ["events:write"],
      keyHint: "analas_sk_tenant_••••1234",
      lastFour: "1234",
    } as any);

    const res = await POST(reqWithBody({}), paramsOf({ workspaceId: "ws_1" }));
    const data = await res.json();

    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopes: ["events:write"],
          keyHint: expect.stringContaining("••••"),
          lastFour: expect.any(String),
        }),
      })
    );
    expect(data.rawKey).toMatch(/^analas_sk_/);
  });

  it("supports custom key names when provided in the request body", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspace: { id: "ws_1", tenantId: "tenant_abc123" },
    } as any);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: "k2",
      name: "Production Ingest Service",
      scopes: ["events:write"],
      keyHint: "analas_sk_tenant_••••5678",
      lastFour: "5678",
    } as any);

    const res = await POST(
      reqWithBody({ name: "Production Ingest Service", scopes: ["events:write"] }),
      paramsOf({ workspaceId: "ws_1" })
    );
    const data = await res.json();

    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Production Ingest Service",
        }),
      })
    );
    expect(data.name).toBe("Production Ingest Service");
    expect(data.keyHint).toBeDefined();
    expect(data.lastFour).toBeDefined();
  });

  it("silently drops unknown scope strings instead of persisting them", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspace: { id: "ws_1", tenantId: "tenant_abc123" },
    } as any);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: "k1",
      name: "Key",
      scopes: ["insights:read"],
      keyHint: "analas_sk_tenant_••••1234",
      lastFour: "1234",
    } as any);

    await POST(reqWithBody({ scopes: ["insights:read", "sudo:everything"] }), paramsOf({ workspaceId: "ws_1" }));

    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ scopes: ["insights:read"] }) })
    );
  });

  it("rejects the request when every requested scope is invalid", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspace: { id: "ws_1", tenantId: "tenant_abc123" },
    } as any);

    const res = await POST(reqWithBody({ scopes: ["sudo:everything"] }), paramsOf({ workspaceId: "ws_1" }));

    expect(res.status).toBe(400);
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/workspace/:workspaceId/api-keys", () => {
  it("returns each key's scopes, keyHint, lastFour, and lastUsedAt alongside its name", async () => {
    vi.mocked(getAppSession).mockResolvedValue(session as any);
    const lastUsed = new Date();
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspace: {
        apiKeys: [
          {
            id: "k1",
            name: "Backend Key",
            scopes: ["events:read"],
            keyHint: "analas_sk_tenant_••••1234",
            lastFour: "1234",
            lastUsedAt: lastUsed,
            createdAt: new Date(),
          },
        ],
      },
    } as any);

    const res = await GET(new Request("https://analas.test"), paramsOf({ workspaceId: "ws_1" }));
    const body = await res.json();

    expect(body.apiKeys[0].scopes).toEqual(["events:read"]);
    expect(body.apiKeys[0].keyHint).toBe("analas_sk_tenant_••••1234");
    expect(body.apiKeys[0].lastFour).toBe("1234");
    expect(body.apiKeys[0].lastUsedAt).toBeDefined();
  });
});
