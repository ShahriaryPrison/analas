import { queryJson } from "@/lib/clickhouse";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId") || "your-tenant-id"; // fallback or pass via query

    // Find the first tenant ID if not provided
    let targetTenant = tenantId;
    if (tenantId === "your-tenant-id") {
      const tenants = await queryJson<{ tenant_id: string }>(`SELECT distinct tenant_id FROM events LIMIT 1`).catch(() => []);
      if (tenants.length > 0) {
        targetTenant = tenants[0].tenant_id;
      }
    }

    const steps = ["map_button_rendered", "map_button_clicked", "page_loaded"];
    const stepConditions = steps.map((_, i) => `event = {step${i}:String}`).join(", ");
    
    const params: Record<string, any> = { tenantId: targetTenant, steps };
    steps.forEach((s, i) => params[`step${i}`] = s);

    const query = `
      SELECT
          level,
          count() AS count
       FROM (
          SELECT
              windowFunnel(86400)(
                  ts,
                  ${stepConditions}
              ) AS level
          FROM events
          WHERE tenant_id = {tenantId:String}
            AND event IN ({steps:Array(String)})
            AND ts >= now() - INTERVAL 30 DAY
          GROUP BY session_id
       )
       GROUP BY level ORDER BY level ASC
    `;

    // Try executing it
    try {
      const result = await queryJson(query, params);
      return NextResponse.json({ 
        status: "success", 
        targetTenant,
        query,
        params,
        result 
      });
    } catch (dbError: any) {
      return NextResponse.json({ 
        status: "db_error", 
        targetTenant,
        query,
        params,
        errorMessage: dbError.message,
        errorStack: dbError.stack 
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
