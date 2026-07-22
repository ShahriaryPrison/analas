import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fakeAuth, denied, paramsOf } from "@/test/helpers";

const openSession = vi.fn();
vi.mock("@/lib/recordings/store", () => ({
  getRecordingStore: () => ({ openSession }),
}));
vi.mock("@/lib/api-auth", () => ({ resolveApiKey: vi.fn() }));

const { GET } = await import("./route");

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

function streamOf(bytes: Uint8Array): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/recordings/:sessionId/stream", () => {
  it("passes through the auth denial unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(denied(401));
    const res = await GET(new Request("https://analas.test"), paramsOf({ sessionId: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it("rejects a session id that isn't a valid UUIDv4", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth());
    const res = await GET(new Request("https://analas.test"), paramsOf({ sessionId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for a recording outside the key's own workspace", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine", plan: "PRO" }));
    vi.mocked(prisma.sessionRecording.findFirst).mockResolvedValue(null);

    const res = await GET(new Request("https://analas.test"), paramsOf({ sessionId: VALID_UUID }));

    expect(prisma.sessionRecording.findFirst).toHaveBeenCalledWith({
      where: { id: VALID_UUID, workspaceId: "ws_mine" },
      select: { storageKey: true },
    });
    expect(res.status).toBe(404);
  });

  it("decompresses gzip chunks and returns plain NDJSON", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine", plan: "PRO" }));
    vi.mocked(prisma.sessionRecording.findFirst).mockResolvedValue({ storageKey: "ws_mine/sess_1" } as any);

    const zlib = await import("node:zlib");
    const gzipped = zlib.gzipSync(Buffer.from('{"type":"click"}\n'));
    openSession.mockResolvedValue(streamOf(gzipped));

    const res = await GET(new Request("https://analas.test"), paramsOf({ sessionId: VALID_UUID }));
    const text = await res.text();

    expect(text).toBe('{"type":"click"}\n');
    expect(res.headers.get("content-type")).toBe("application/x-ndjson");
  });

  it("passes already-decompressed NDJSON through unchanged", async () => {
    vi.mocked(resolveApiKey).mockResolvedValue(fakeAuth({ workspaceId: "ws_mine", plan: "PRO" }));
    vi.mocked(prisma.sessionRecording.findFirst).mockResolvedValue({ storageKey: "ws_mine/sess_1" } as any);
    openSession.mockResolvedValue(streamOf(Buffer.from('{"type":"scroll"}\n')));

    const res = await GET(new Request("https://analas.test"), paramsOf({ sessionId: VALID_UUID }));
    const text = await res.text();

    expect(text).toBe('{"type":"scroll"}\n');
  });
});
