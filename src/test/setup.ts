import { vi } from "vitest";

// getEffectivePlan()/hasFeature() treat an unset NEXT_PUBLIC_IS_CLOUD_HOSTED as self-hosted
// and silently grant every workspace ENTERPRISE features, which would make every plan-gating
// test a false pass. .env.example ships "true" for the real cloud deployment — match it here.
process.env.NEXT_PUBLIC_IS_CLOUD_HOSTED = "true";

// Global mocks for every test file: nothing here should touch a real Postgres/ClickHouse
// connection. Individual tests configure return values via `vi.mocked(prisma.x.y).mockResolvedValue(...)`.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: { findUnique: vi.fn(), create: vi.fn() },
    workspace: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    workspaceMember: { findFirst: vi.fn() },
    insight: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    dashboard: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
    sessionRecording: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/clickhouse", () => ({
  clickhouse: {},
  queryJson: vi.fn(),
  insertEvents: vi.fn(),
  getTopEvents: vi.fn(),
}));
