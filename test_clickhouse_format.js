import { clickhouse } from "./src/lib/clickhouse.js";

async function main() {
  const res1 = await clickhouse.query({ query: "SELECT formatDateTime(toDateTime('2026-08-09 10:15:59'), '%Y-%m-%d %H:%M:%S') AS v", format: "JSONEachRow" });
  console.log("With %M:", await res1.json());

  const res2 = await clickhouse.query({ query: "SELECT formatDateTime(toDateTime('2026-08-09 10:15:59'), '%Y-%m-%d %H:%i:%S') AS v", format: "JSONEachRow" });
  console.log("With %i:", await res2.json());
  
  const res3 = await clickhouse.query({ query: "SELECT formatDateTime(toDateTime('2026-08-09 10:15:59'), '%F %T') AS v", format: "JSONEachRow" });
  console.log("With %F %T:", await res3.json());
}
main().catch(console.error);
