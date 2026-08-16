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
