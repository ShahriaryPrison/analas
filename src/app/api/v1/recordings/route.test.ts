import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fakeAuth, denied } from "@/test/helpers";
import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/recordings", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(401));
    const res = await GET(new Request("https://analas.test/api/v1/recordings"));
    expect(res.status).toBe(401);
  });

  it("scopes the query to the key's own workspace and applies pagePath/distinctId filters", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine", plan: "PRO" }));
    vi.mocked(prisma.sessionRecording.count).mockResolvedValue(1);
    vi.mocked(prisma.sessionRecording.findMany).mockResolvedValue([
      { id: "rec_1", createdAt: new Date("2026-01-01") },
    ] as any);

    await GET(new Request("https://analas.test/api/v1/recordings?pagePath=/checkout&distinctId=u1"));

    expect(prisma.sessionRecording.count).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws_mine",
        pagePath: { contains: "/checkout", mode: "insensitive" },
        distinctId: { contains: "u1", mode: "insensitive" },
      },
    });
  });
});
