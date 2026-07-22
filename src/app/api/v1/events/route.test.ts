import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { getTopEvents } from "@/lib/clickhouse";
import { fakeAuth, denied } from "@/test/helpers";
import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/events", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(403));
    const res = await GET(new Request("https://analas.test/api/v1/events"));
    expect(res.status).toBe(403);
  });

  it("queries ClickHouse scoped to the key's own tenant, not any client input", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ tenantId: "tenant_42" }));
    vi.mocked(getTopEvents).mockResolvedValue(["signup", "purchase"]);

    const res = await GET(new Request("https://analas.test/api/v1/events"));
    const body = await res.json();

    expect(getTopEvents).toHaveBeenCalledWith("tenant_42", 10);
    expect(body).toEqual({ events: ["signup", "purchase"] });
  });

  it("clamps an oversized limit query param to 100", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth());
    vi.mocked(getTopEvents).mockResolvedValue([]);

    await GET(new Request("https://analas.test/api/v1/events?limit=99999"));

    expect(getTopEvents).toHaveBeenCalledWith("tenant_1", 100);
  });
});
