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

export async function insertEvents(table: string, values: any[]) {
  await ensureMigration();
  return clickhouse.insert({
    table,
    values,
    format: "JSONEachRow",
  });
}

export async function getTopEvents(tenantId: string, limit: number = 10) {
  const rows = await queryJson<{ event: string }>(
    `SELECT event FROM events 
     WHERE tenant_id = {tenantId:String} 
     GROUP BY event ORDER BY count() DESC LIMIT {limit:Int32}`,
    { tenantId, limit }
  ).catch(() => []);
  return rows.map(r => r.event);
}
