import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { queryJson } from "@/lib/clickhouse";
import { paramsOf } from "@/test/helpers";
import { GET } from "./route";

vi.mock("@/lib/session", () => ({ getAppSession: vi.fn() }));

import { getAppSession } from "@/lib/session";

function reqWithEvent(event: string | null) {
  const url = new URL("https://analas.test/api/workspace/ws_1/properties");
  if (event !== null) url.searchParams.set("event", event);
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAppSession).mockResolvedValue({ user: { email: "owner@test.com" } });
  vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
    id: "ws_1",
    tenantId: "tenant_abc123",
  } as any);
  vi.mocked(queryJson).mockResolvedValue([]);
});

describe("GET /api/workspace/:workspaceId/properties", () => {
  it("trims a padded event name before using it as an exact-match filter", async () => {
    await GET(reqWithEvent("  workspace_locate_123  "), paramsOf({ workspaceId: "ws_1" }));

    const [, params] = vi.mocked(queryJson).mock.calls[0];
    expect((params as Record<string, unknown>).event).toBe("workspace_locate_123");
  });

  it("returns an empty array when the event name is only whitespace", async () => {
    const res = await GET(reqWithEvent("   "), paramsOf({ workspaceId: "ws_1" }));
    const body = await res.json();

    expect(body).toEqual([]);
    expect(queryJson).not.toHaveBeenCalled();
  });
});
