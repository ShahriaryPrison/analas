import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { insertEvents } from "@/lib/clickhouse";
import { POST } from "./route";

function reqWithBody(body: unknown, key = "analas_pk_test_key") {
  return new Request("https://analas.test/api/capture", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockApiKey(overrides: Partial<{ tenantId: string }> = {}) {
  vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
    id: "key_1",
    workspace: {
      id: "ws_1",
      tenantId: overrides.tenantId ?? "tenant_1",
      plan: "FREE",
      currentMonthEvents: 0,
      allowedDomains: [],
      currentPeriodEnd: null,
    },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/capture", () => {
  it("trims leading/trailing whitespace from the event name before writing to ClickHouse", async () => {
    mockApiKey({ tenantId: "tenant_padded" });

    const res = await POST(reqWithBody({ event: "  workspace_locate_123  " }, "analas_pk_padded_test"));
    expect(res.status).toBe(202);

    // Flush is debounced (5s) unless the buffer hits MAX_BUFFER_SIZE.
    await vi.advanceTimersByTimeAsync(5000);

    expect(insertEvents).toHaveBeenCalledTimes(1);
    const [, values] = vi.mocked(insertEvents).mock.calls[0];
    expect(values).toHaveLength(1);
    expect((values[0] as { event: string }).event).toBe("workspace_locate_123");
  });

  it("rejects an event whose name is only whitespace", async () => {
    mockApiKey({ tenantId: "tenant_blank" });

    const res = await POST(reqWithBody({ event: "   " }, "analas_pk_blank_test"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid payload");

    await vi.advanceTimersByTimeAsync(5000);
    expect(insertEvents).not.toHaveBeenCalled();
  });

  it("leaves an already-clean event name untouched", async () => {
    mockApiKey({ tenantId: "tenant_clean" });

    const res = await POST(reqWithBody({ event: "signup" }, "analas_pk_clean_test"));
    expect(res.status).toBe(202);

    await vi.advanceTimersByTimeAsync(5000);

    const [, values] = vi.mocked(insertEvents).mock.calls[0];
    expect((values[0] as { event: string }).event).toBe("signup");
  });
});

// Regression coverage for the bug where custom fields sent inside a `properties` wrapper
// (the shape Segment/Mixpanel/Amplitude clients all send: { event, properties: {...} })
// were silently dropped: only userId/anonymousId/sessionId were pulled out of the wrapper,
// and the literal `properties` key was then re-nested inside the stored properties JSON,
// making every field inside it unreachable by breakdown/filter queries.
describe("POST /api/capture — flattens a nested `properties` wrapper", () => {
  it("lifts custom fields out of a properties wrapper to the top level", async () => {
    mockApiKey({ tenantId: "tenant_wrapped" });

    const res = await POST(
      reqWithBody(
        { event: "purchase", properties: { city: "Tehran", plan: "pro" } },
        "analas_pk_wrapped_test"
      )
    );
    expect(res.status).toBe(202);

    await vi.advanceTimersByTimeAsync(5000);

    const [, values] = vi.mocked(insertEvents).mock.calls[0];
    const stored = JSON.parse((values[0] as { properties: string }).properties);
    expect(stored.city).toBe("Tehran");
    expect(stored.plan).toBe("pro");
  });

  it("does not leave a literal `properties` key nested inside the stored JSON", async () => {
    mockApiKey({ tenantId: "tenant_wrapped_2" });

    const res = await POST(
      reqWithBody(
        { event: "purchase", properties: { city: "Tehran" } },
        "analas_pk_wrapped_test_2"
      )
    );
    expect(res.status).toBe(202);

    await vi.advanceTimersByTimeAsync(5000);

    const [, values] = vi.mocked(insertEvents).mock.calls[0];
    const stored = JSON.parse((values[0] as { properties: string }).properties);
    expect(stored.properties).toBeUndefined();
  });

  it("still extracts userId/anonymousId/sessionId out of a properties wrapper", async () => {
    mockApiKey({ tenantId: "tenant_wrapped_3" });

    const res = await POST(
      reqWithBody(
        {
          event: "purchase",
          properties: { userId: "usr_wrapped", sessionId: "sess_wrapped", city: "Tehran" },
        },
        "analas_pk_wrapped_test_3"
      )
    );
    expect(res.status).toBe(202);

    await vi.advanceTimersByTimeAsync(5000);

    const [, values] = vi.mocked(insertEvents).mock.calls[0];
    const row = values[0] as { user_id: string; session_id: string; properties: string };
    expect(row.user_id).toBe("usr_wrapped");
    expect(row.session_id).toBe("sess_wrapped");

    const stored = JSON.parse(row.properties);
    expect(stored.userId).toBeUndefined();
    expect(stored.sessionId).toBeUndefined();
    expect(stored.city).toBe("Tehran");
  });

  it("still works for a flat (non-wrapped) payload", async () => {
    mockApiKey({ tenantId: "tenant_flat" });

    const res = await POST(
      reqWithBody({ event: "purchase", city: "Tehran", plan: "pro" }, "analas_pk_flat_test")
    );
    expect(res.status).toBe(202);

    await vi.advanceTimersByTimeAsync(5000);

    const [, values] = vi.mocked(insertEvents).mock.calls[0];
    const stored = JSON.parse((values[0] as { properties: string }).properties);
    expect(stored.city).toBe("Tehran");
    expect(stored.plan).toBe("pro");
  });
});
