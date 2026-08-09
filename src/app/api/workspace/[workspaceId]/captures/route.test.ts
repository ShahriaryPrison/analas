import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuthorizedWorkspace } from "@/lib/workspace-access";
import { queryJson } from "@/lib/clickhouse";
import { paramsOf } from "@/test/helpers";
import { GET } from "./route";

vi.mock("@/lib/workspace-access", () => ({ getAuthorizedWorkspace: vi.fn() }));
vi.mock("@/lib/clickhouse", () => ({ queryJson: vi.fn() }));
// Prevent console.error from polluting test output
vi.spyOn(console, "error").mockImplementation(() => {});

function reqWithParams(searchParams: Record<string, string> = {}) {
  const url = new URL("https://analas.test/api/workspace/ws_1/captures");
  for (const [key, val] of Object.entries(searchParams)) {
    url.searchParams.set(key, val);
  }
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthorizedWorkspace).mockResolvedValue({
    workspace: { id: "ws_1", tenantId: "tenant_abc123" },
  } as any);
});

describe("GET /api/workspace/:workspaceId/captures", () => {
  it("returns 500 when getAuthorizedWorkspace fails (e.g. unauthenticated or missing workspace)", async () => {
    vi.mocked(getAuthorizedWorkspace).mockRejectedValue(new Error("Unauthorized"));
    const res = await GET(reqWithParams(), paramsOf({ workspaceId: "ws_1" }));
    expect(res.status).toBe(500);
  });

  it("fetches captures with default parameters when no query params are provided", async () => {
    vi.mocked(queryJson).mockImplementation(async (query: string) => {
      if (query.includes("count() AS total")) return [{ total: "0" }];
      return [];
    });

    const res = await GET(reqWithParams(), paramsOf({ workspaceId: "ws_1" }));
    const data = await res.json();

    expect(data.rows).toEqual([]);
    expect(data.total).toBe(0);

    // Verify limit and offset defaults
    expect(queryJson).toHaveBeenNthCalledWith(1, expect.stringContaining("LIMIT 50 OFFSET 0"), expect.objectContaining({ tenantId: "tenant_abc123" }));
    
    // Verify no date bounds are artificially injected (e.g., ts <= now()) when dateTo is empty
    const firstCallQuery = vi.mocked(queryJson).mock.calls[0][0];
    expect(firstCallQuery).not.toContain("ts <= now()");
  });

  it("applies limit and offset from query parameters", async () => {
    vi.mocked(queryJson).mockResolvedValue([]);
    await GET(reqWithParams({ limit: "15", offset: "30" }), paramsOf({ workspaceId: "ws_1" }));

    expect(queryJson).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("LIMIT 15 OFFSET 30"),
      expect.any(Object)
    );
  });

  it("applies filters (event, userId, dateFrom, dateTo) properly", async () => {
    vi.mocked(queryJson).mockResolvedValue([]);
    await GET(
      reqWithParams({
        event: "test_event",
        userId: "user_123",
        dateFrom: "2026-08-01 00:00:00",
        dateTo: "2026-08-09 00:00:00",
      }),
      paramsOf({ workspaceId: "ws_1" })
    );

    const callArgs = vi.mocked(queryJson).mock.calls[0];
    const query = callArgs[0] as string;
    const params = callArgs[1] as Record<string, unknown>;

    expect(query).toContain("event ILIKE {eventPattern:String}");
    expect(query).toContain("user_id = {userId:String}");
    expect(query).toContain("ts >= {dateFrom:String}");
    expect(query).toContain("ts <= {dateTo:String}");

    expect(params.eventPattern).toBe("%test_event%");
    expect(params.userId).toBe("user_123");
    expect(params.dateFrom).toBe("2026-08-01 00:00:00");
    expect(params.dateTo).toBe("2026-08-09 00:00:00");
  });

  it("uses %i (minutes) instead of %M (month name) in formatDateTime to prevent string comparison bugs", async () => {
    vi.mocked(queryJson).mockResolvedValue([]);
    await GET(reqWithParams(), paramsOf({ workspaceId: "ws_1" }));

    const firstCallQuery = vi.mocked(queryJson).mock.calls[0][0];
    
    // This asserts that the query uses the fixed format string that doesn't output things like '10:August:59'
    expect(firstCallQuery).toContain("formatDateTime(ts, '%Y-%m-%d %H:%i:%S'");
    expect(firstCallQuery).not.toContain("formatDateTime(ts, '%Y-%m-%d %H:%M:%S'");
  });

  it("handles valid data results perfectly", async () => {
    vi.mocked(queryJson).mockImplementation(async (query: string) => {
      if (query.includes("count() AS total")) return [{ total: "42" }];
      return [
        {
          event: "page_viewed",
          user_id: "usr_123",
          session_id: "sess_456",
          properties: "{}",
          ts: "2026-08-09 10:08:59"
        }
      ];
    });

    const res = await GET(reqWithParams(), paramsOf({ workspaceId: "ws_1" }));
    const data = await res.json();

    expect(data.total).toBe(42);
    expect(data.rows.length).toBe(1);
    expect(data.rows[0].event).toBe("page_viewed");
    expect(data.rows[0].ts).toBe("2026-08-09 10:08:59");
  });

  it("catches ClickHouse errors and returns 500 cleanly", async () => {
    vi.mocked(queryJson).mockRejectedValue(new Error("ClickHouse Timeout"));
    const res = await GET(reqWithParams(), paramsOf({ workspaceId: "ws_1" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal error");
  });
});
