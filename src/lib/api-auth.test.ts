import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiKey } from "@/lib/api-auth";

// Every test uses its own unique raw key so the module-level cache/rate-limit
// Maps in api-auth.ts (shared across all `it()` blocks in this file) never collide.
function req(rawKey: string | null, headers: Record<string, string> = {}) {
  const h = new Headers(headers);
  if (rawKey) h.set("authorization", `Bearer ${rawKey}`);
  return new Request("https://analas.test/api/v1/events", { headers: h });
}

const baseWorkspace = {
  id: "ws_1",
  tenantId: "tenant_1",
  plan: "PRO",
  allowedDomains: [] as string[],
  currentPeriodEnd: null as Date | null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveApiKey", () => {
  it("rejects a missing Authorization header", async () => {
    const result = await resolveApiKey(req(null), { scope: "events:read" });
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("rejects an unknown private key", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce(null);
    const result = await resolveApiKey(req("analas_pk_unknown-1"), { scope: "events:read" });
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("rejects an unknown public token", async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce(null);
    const result = await resolveApiKey(req("analas_pub_unknown-1"), { scope: "events:write" });
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("resolves a valid private key that has the requested scope", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      scopes: ["events:read", "insights:read"],
      workspace: baseWorkspace,
    } as any);

    const result = await resolveApiKey(req("analas_pk_valid-1"), { scope: "events:read" });
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toMatchObject({ tenantId: "tenant_1", workspaceId: "ws_1", plan: "PRO" });
  });

  it("returns 403 when the key does not carry the requested scope", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      scopes: ["events:write"],
      workspace: baseWorkspace,
    } as any);

    const result = await resolveApiKey(req("analas_pk_valid-2"), { scope: "insights:write" });
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("limits a public token to events:write regardless of stored scopes", async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce(baseWorkspace as any);

    const deniedRead = await resolveApiKey(req("analas_pub_token-1"), { scope: "events:read" });
    expect(deniedRead).toBeInstanceOf(NextResponse);
    expect((deniedRead as NextResponse).status).toBe(403);
  });

  it("allows a public token to write events", async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce(baseWorkspace as any);

    const allowed = await resolveApiKey(req("analas_pub_token-2"), { scope: "events:write" });
    expect(allowed).not.toBeInstanceOf(NextResponse);
  });

  it("auto-downgrades an expired paid plan to FREE and persists it", async () => {
    const expired = {
      ...baseWorkspace,
      id: "ws_expired",
      plan: "PRO",
      currentPeriodEnd: new Date("2020-01-01"),
    };
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      scopes: ["events:read"],
      workspace: expired,
    } as any);
    vi.mocked(prisma.workspace.update).mockResolvedValueOnce({} as any);

    const result = await resolveApiKey(req("analas_pk_expired-1"), { scope: "events:read" });

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { plan: string }).plan).toBe("FREE");
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_expired" },
      data: { plan: "FREE", internalSubscriptionId: null, currentPeriodEnd: null },
    });
  });

  it("rejects a request from an origin outside the workspace's allowed domains", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      scopes: ["events:read"],
      workspace: { ...baseWorkspace, allowedDomains: ["acme.com"] },
    } as any);

    const result = await resolveApiKey(req("analas_pk_domain-1", { origin: "https://evil.com" }), {
      scope: "events:read",
    });
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("allows a request from an allowed subdomain", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      scopes: ["events:read"],
      workspace: { ...baseWorkspace, allowedDomains: ["acme.com"] },
    } as any);

    const result = await resolveApiKey(req("analas_pk_domain-2", { origin: "https://app.acme.com" }), {
      scope: "events:read",
    });
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("does not enforce allowedDomains when no Origin/Referer header is present (server-to-server calls)", async () => {
    // Agents and backend cron jobs calling /api/v1 directly (curl, a server-side HTTP client)
    // never send an Origin header — only browsers do for cross-origin requests. The domain
    // allow-list exists to protect the browser-facing public token, not private server keys.
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      scopes: ["events:read"],
      workspace: { ...baseWorkspace, allowedDomains: ["acme.com"] },
    } as any);

    const result = await resolveApiKey(req("analas_pk_domain-3"), { scope: "events:read" });
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("returns 429 once the per-key rate limit is exceeded within the window", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      scopes: ["events:read"],
      workspace: baseWorkspace,
    } as any);

    const key = "analas_pk_rate-1";
    const first = await resolveApiKey(req(key), { scope: "events:read", rateLimit: 1 });
    expect(first).not.toBeInstanceOf(NextResponse);

    const second = await resolveApiKey(req(key), { scope: "events:read", rateLimit: 1 });
    expect(second).toBeInstanceOf(NextResponse);
    expect((second as NextResponse).status).toBe(429);
  });

  it("reuses a cached key lookup within the TTL instead of hitting the database again", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      scopes: ["events:read"],
      workspace: baseWorkspace,
    } as any);

    const key = "analas_pk_cache-1";
    await resolveApiKey(req(key), { scope: "events:read" });
    await resolveApiKey(req(key), { scope: "events:read" });

    expect(prisma.apiKey.findUnique).toHaveBeenCalledTimes(1);
  });

  it("authenticates structured secret keys with analas_sk_ prefix", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "key_sk_1",
      keyHint: "analas_sk_tenant_••••9999",
      lastFour: "9999",
      scopes: ["events:read"],
      workspace: baseWorkspace,
    } as any);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);

    const key = "analas_sk_tenant_0123456789abcdef0123456789abcdef";
    const result = await resolveApiKey(req(key), { scope: "events:read" });

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).workspaceId).toBe("ws_1");
  });

  it("maintains 100% backward compatibility for legacy keys lacking keyHint and lastFour", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "legacy_key_1",
      keyHint: null,
      lastFour: null,
      scopes: ["events:write"],
      workspace: baseWorkspace,
    } as any);

    const legacyKey = "analas_pk_3c0d8b4e-7b79-4d26-a0bf-b58611eb2cb9";
    const result = await resolveApiKey(req(legacyKey), { scope: "events:write" });

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).tenantId).toBe("tenant_1");
  });
});
