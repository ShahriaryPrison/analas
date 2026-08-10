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
