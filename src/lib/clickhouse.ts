import { createClient } from "@clickhouse/client";

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
});

export async function queryJson<T>(
  query: string,
  query_params?: Record<string, unknown>
) {
  const resultSet = await clickhouse.query({
    query,
    format: "JSONEachRow",
    ...(query_params ? { query_params } : {}),
  });
  return resultSet.json<T>();
}
