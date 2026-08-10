import { createClient } from "@clickhouse/client";

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
});

let migrationRun = false;

async function ensureMigration() {
  if (migrationRun) return;
  try {
    await clickhouse.exec({ query: `ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id String DEFAULT ''` });
    await clickhouse.exec({ query: `ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id String DEFAULT ''` });
    await clickhouse.exec({ query: `ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at DateTime DEFAULT ts + INTERVAL 365 DAY` });
    await clickhouse.exec({ query: `ALTER TABLE events MODIFY TTL expires_at` });
    migrationRun = true;
  } catch (e) {
    console.error("Failed to migrate ClickHouse schema:", e);
  }
}

export async function queryJson<T>(
  query: string,
  query_params?: Record<string, unknown>
) {
  await ensureMigration();
  const resultSet = await clickhouse.query({
    query,
    format: "JSONEachRow",
    ...(query_params ? { query_params } : {}),
  });
  return resultSet.json<T>();
}

export async function insertEvents(table: string, values: Record<string, unknown>[]) {
  await ensureMigration();
  return clickhouse.insert({
    table,
    values,
    format: "JSONEachRow",
  });
}

export async function getTopEvents(tenantId: string, limit: number = 10) {
    const resultSet = await clickhouse.query({
      query: `SELECT event, count() as c FROM events WHERE tenant_id = {tenantId:String} GROUP BY event ORDER BY c DESC LIMIT ${Number(limit)}`,
      query_params: { tenantId },
      format: "JSONEachRow",
    });
    const rows = await resultSet.json<{ event: string }>();
  return rows.map(r => r.event);
}
