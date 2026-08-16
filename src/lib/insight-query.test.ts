import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { queryJson } from "@/lib/clickhouse";
import { fetchInsightData } from "./insight-query";

beforeEach(() => {
  vi.clearAllMocks();
  // fetchInsightData looks up the workspace's plan by tenantId to compute retention;
  // an unmatched tenantId falls back to FREE (30-day retention), which is fine for these tests.
  vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null as any);
  vi.mocked(queryJson).mockResolvedValue([]);
});

// Regression coverage for the bug where a saved insight's eventName carried a stray
// trailing space (from copy/paste or UI input) and silently returned zero results,
// because ClickHouse's `event = {event:String}` is an exact match against the
// untrimmed stored event name.
describe("fetchInsightData — whitespace trimming on exact-match filters", () => {
  it("trims eventName for a count insight", async () => {
    await fetchInsightData("tenant_1", "count", { eventName: "  workspace_locate_123  " });
    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).event).toBe("workspace_locate_123");
  });

  it("trims eventName for a trend insight", async () => {
    await fetchInsightData("tenant_1", "trend", { eventName: " signup\n" });
    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).event).toBe("signup");
  });

  it("trims eventName for a breakdown insight", async () => {
    await fetchInsightData("tenant_1", "breakdown", { eventName: "\tpurchase ", property: "plan" });
    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).event).toBe("purchase");
  });

  it("trims eventName for a metric insight", async () => {
    await fetchInsightData("tenant_1", "metric", { eventName: " checkout ", aggregation: "avg", property: "value" });
    const calls = vi.mocked(queryJson).mock.calls;
    for (const [, params] of calls) {
      expect((params as Record<string, unknown>).event).toBe("checkout");
    }
  });

  it("trims each event in a multi_trend event list", async () => {
    await fetchInsightData("tenant_1", "multi_trend", { eventNames: " signup , login " });
    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).events).toEqual(["signup", "login"]);
  });

  it("trims each step in a funnel event list", async () => {
    await fetchInsightData("tenant_1", "funnel", { eventSteps: " viewed , added_to_cart , purchased " });
    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).steps).toEqual(["viewed", "added_to_cart", "purchased"]);
  });

  it("trims startEvent/returnEvent for a retention insight", async () => {
    await fetchInsightData("tenant_1", "retention", {
      startEvent: " signup ",
      returnEvent: " login ",
      timeFrame: "7",
    });
    const calls = vi.mocked(queryJson).mock.calls;
    for (const [, params] of calls) {
      const p = params as Record<string, unknown>;
      expect(p.startEvent).toBe("signup");
      expect(p.returnEvent).toBe("login");
    }
  });

  it("trims startEventValue/returnEventValue property filters for a retention insight", async () => {
    await fetchInsightData("tenant_1", "retention", {
      startEvent: "signup",
      returnEvent: "login",
      startEventProperty: "plan",
      startEventValue: " pro ",
      returnEventProperty: "plan",
      returnEventValue: " pro ",
      timeFrame: "7",
    });
    const calls = vi.mocked(queryJson).mock.calls;
    for (const [, params] of calls) {
      const p = params as Record<string, unknown>;
      expect(p.startEventValue).toBe("pro");
      expect(p.returnEventValue).toBe("pro");
    }
  });
});

// Regression coverage for the bug where a "count" insight ignored the requested
// timeFrame entirely and always queried the plan's full retention window, so a
// 7-day count and a 30-day count on the same event returned identical numbers.
// An unmatched tenantId falls back to FREE (30-day retention) per the beforeEach above.
describe("fetchInsightData — count respects the requested time window", () => {
  it("uses the requested timeFrame, not the plan's full retention window", async () => {
    await fetchInsightData("tenant_1", "count", { eventName: "signup", timeFrame: "7" });

    const [query, params] = vi.mocked(queryJson).mock.calls[0];
    expect(query).toContain("INTERVAL {countDays:Int32} DAY");
    expect((params as Record<string, unknown>).countDays).toBe(7);
  });

  it("clamps timeFrame to the plan's retention window when the request asks for more", async () => {
    await fetchInsightData("tenant_1", "count", { eventName: "signup", timeFrame: "9999" });

    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).countDays).toBe(30);
  });

  it("returns different countDays for different timeFrames on the same event", async () => {
    await fetchInsightData("tenant_1", "count", { eventName: "signup", timeFrame: "7" });
    const shortWindow = (vi.mocked(queryJson).mock.calls[0][1] as Record<string, unknown>).countDays;

    vi.mocked(queryJson).mockClear();
    await fetchInsightData("tenant_1", "count", { eventName: "signup", timeFrame: "30" });
    const longWindow = (vi.mocked(queryJson).mock.calls[0][1] as Record<string, unknown>).countDays;

    expect(shortWindow).toBe(7);
    expect(longWindow).toBe(30);
    expect(shortWindow).not.toBe(longWindow);
  });
});

function mockPlan(tenantId: string, plan: "FREE" | "PRO") {
  vi.mocked(prisma.workspace.findUnique).mockImplementation(((args: any) => {
    if (args?.where?.tenantId === tenantId) return Promise.resolve({ plan });
    return Promise.resolve(null);
  }) as any);
}

// Coverage for the property-filters feature added to "breakdown": each filter's property
// name is whitelist-sanitized and inlined (ClickHouse needs it as a SQL literal), while the
// value is always passed as a parameterized bind param — never string-concatenated into the
// query — so a malicious value can't inject SQL. Filters also require the advanced_filters
// plan feature and are capped in count, independent of insight type.
describe("fetchInsightData — breakdown property filters", () => {
  it("appends a parameterized filter clause for a PRO-plan workspace", async () => {
    mockPlan("tenant_filters_pro", "PRO");

    await fetchInsightData("tenant_filters_pro", "breakdown", {
      eventName: "purchase",
      property: "plan",
      filters: [{ property: "city", value: "Tehran" }],
    });

    const [query, params] = vi.mocked(queryJson).mock.calls[0];
    expect(query).toContain("JSONExtractString(properties, 'city') = {filterValue0:String}");
    // The value must never be inlined into the query text itself.
    expect(query).not.toContain("Tehran");
    expect((params as Record<string, unknown>).filterValue0).toBe("Tehran");
  });

  it("strips SQL metacharacters from a malicious filter property name", async () => {
    mockPlan("tenant_filters_inject_prop", "PRO");

    await fetchInsightData("tenant_filters_inject_prop", "breakdown", {
      eventName: "purchase",
      property: "plan",
      filters: [{ property: "city'; DROP TABLE events;--", value: "x" }],
    });

    const [query] = vi.mocked(queryJson).mock.calls[0];
    expect(query).not.toMatch(/DROP\s+TABLE/i);
    expect(query).not.toContain("'; ");
    expect(query).toContain("JSONExtractString(properties, 'cityDROPTABLEevents')");
  });

  it("never inlines a malicious filter value into the query text", async () => {
    mockPlan("tenant_filters_inject_val", "PRO");

    const evilValue = "x'; DROP TABLE events;--";
    await fetchInsightData("tenant_filters_inject_val", "breakdown", {
      eventName: "purchase",
      property: "plan",
      filters: [{ property: "city", value: evilValue }],
    });

    const [query, params] = vi.mocked(queryJson).mock.calls[0];
    expect(query).not.toContain(evilValue);
    expect(query).not.toMatch(/DROP\s+TABLE/i);
    expect((params as Record<string, unknown>).filterValue0).toBe(evilValue);
  });

  it("caps the number of applied filters", async () => {
    mockPlan("tenant_filters_cap", "PRO");

    const filters = Array.from({ length: 8 }, (_, i) => ({ property: `prop${i}`, value: `val${i}` }));
    await fetchInsightData("tenant_filters_cap", "breakdown", {
      eventName: "purchase",
      property: "plan",
      filters,
    });

    const [, params] = vi.mocked(queryJson).mock.calls[0];
    const filterKeys = Object.keys(params as Record<string, unknown>).filter((k) => k.startsWith("filterValue"));
    expect(filterKeys).toHaveLength(5);
  });

  it("ignores filters entirely for a plan without advanced_filters", async () => {
    mockPlan("tenant_filters_free", "FREE");

    await fetchInsightData("tenant_filters_free", "breakdown", {
      eventName: "purchase",
      property: "plan",
      filters: [{ property: "city", value: "Tehran" }],
    });

    const [query, params] = vi.mocked(queryJson).mock.calls[0];
    expect(query).not.toContain("filterValue0");
    expect((params as Record<string, unknown>).filterValue0).toBeUndefined();
  });

  it("still scopes to the caller's own tenantId when filters are applied", async () => {
    mockPlan("tenant_filters_scope", "PRO");

    await fetchInsightData("tenant_filters_scope", "breakdown", {
      eventName: "purchase",
      property: "plan",
      filters: [{ property: "city", value: "Tehran" }],
    });

    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).tenantId).toBe("tenant_filters_scope");
  });
});
