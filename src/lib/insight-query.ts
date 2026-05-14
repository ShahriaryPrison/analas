import { queryJson } from "./clickhouse";

export type DailyRow = { day: string; count: number };
export type BreakdownRow = { val: string; count: number };
export type FunnelRow = { level: number; count: number };

export interface InsightData {
  total: number;
  rows: any[];
}

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Tehran";

export function fillDays(rows: { day: string; count: string | number }[], length: number = 7): DailyRow[] {
  const map = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const result = [];
  
  for (let i = length - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Format the date in the specific timezone using en-CA to get YYYY-MM-DD
    const key = new Intl.DateTimeFormat('en-CA', { 
      timeZone: APP_TIMEZONE, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(d);
    
    result.push({ day: key, count: map.get(key) ?? 0 });
  }
  return result;
}

export async function fetchInsightData(
  tenantId: string,
  type: string,
  config: Record<string, any>
): Promise<InsightData> {
  const timeFrame = Number(config.timeFrame || "7");

  if (type === "count") {
    const eventName = String(config.eventName || "");
    const rows = await queryJson<{ total: string | number }>(
      `SELECT count() AS total FROM events
       WHERE tenant_id = {tenantId:String} AND event = {event:String}`,
      { tenantId, event: eventName }
    ).catch(() => []);
    const total = Number(rows[0]?.total ?? 0);
    return { total, rows: [] };
  }

  if (type === "trend") {
    const eventName = String(config.eventName || "");
    const raw = await queryJson<{ day: string; count: string | number }>(
      `SELECT formatDateTime(ts, '%Y-%m-%d', {timezone:String}) AS day, count() AS count
       FROM events
       WHERE tenant_id = {tenantId:String}
         AND event = {event:String}
         AND ts >= now() - INTERVAL {timeFrame:Int32} DAY
       GROUP BY day ORDER BY day ASC`,
      { tenantId, event: eventName, timeFrame, timezone: APP_TIMEZONE }
    ).catch(() => []);

    const filledRows = fillDays(raw, timeFrame);
    const total = filledRows.reduce((s, r) => s + r.count, 0);
    return { total, rows: filledRows };
  }

  if (type === "breakdown") {
    const eventName = String(config.eventName || "");
    const property = String(config.property || "");
    const rows = await queryJson<BreakdownRow>(
      `SELECT 
          JSONExtractString(properties, {property:String}) AS val, 
          count() AS count
       FROM events
       WHERE tenant_id = {tenantId:String} 
         AND event = {event:String}
         AND ts >= now() - INTERVAL 30 DAY
       GROUP BY val
       ORDER BY count DESC
       LIMIT 10`,
      { tenantId, event: eventName, property }
    ).catch(() => []);
    
    const total = rows.reduce((s, r) => s + Number(r.count), 0);
    return { total, rows };
  }

  if (type === "multi_trend") {
    const eventsStr = String(config.eventNames || "");
    const events = eventsStr.split(",").map(e => e.trim()).filter(Boolean);
    if (events.length === 0) return { total: 0, rows: [] };

    const raw = await queryJson<{ day: string; event: string; count: string | number }>(
      `SELECT formatDateTime(ts, '%Y-%m-%d', {timezone:String}) AS day, event, count() AS count
       FROM events
       WHERE tenant_id = {tenantId:String}
         AND event IN {events:Array(String)}
         AND ts >= now() - INTERVAL {timeFrame:Int32} DAY
       GROUP BY day, event ORDER BY day ASC, event ASC`,
      { tenantId, events, timeFrame, timezone: APP_TIMEZONE }
    ).catch(() => []);

    // Transform into grouped rows: [{ day, counts: { event1: N, event2: M } }]
    const days = fillDays([], timeFrame); // get empty days for the range
    const result = days.map(d => {
      const counts: Record<string, number> = {};
      events.forEach(e => counts[e] = 0);
      raw.filter(r => r.day === d.day).forEach(r => {
        counts[r.event] = Number(r.count);
      });
      return { day: d.day, counts };
    });

    const total = raw.reduce((s, r) => s + Number(r.count), 0);
    return { total, rows: result };
  }

  if (type === "funnel") {
    const stepsStr = String(config.eventSteps || "");
    const steps = stepsStr.split(",").map(s => s.trim()).filter(Boolean);
    if (steps.length === 0) return { total: 0, rows: [] };

    const distinctId = String(config.distinctId || "user_id");
    const isNativeId = distinctId === "user_id" || distinctId === "session_id";
    const groupByExpr = isNativeId ? distinctId : `JSONExtractString(properties, {distinctId:String})`;

    // Build the dynamic windowFunnel query
    // windowFunnel(window)(timestamp, cond1, cond2, ...)
    const stepConditions = steps.map((_, i) => `event = {step${i}:String}`).join(", ");
    
    const params: Record<string, any> = { tenantId, steps };
    if (!isNativeId) {
      params.distinctId = distinctId;
    }
    steps.forEach((s, i) => params[`step${i}`] = s);

    const rows = await queryJson<FunnelRow>(
      `SELECT
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
            AND event IN {steps:Array(String)}
            AND ts >= now() - INTERVAL 30 DAY
          GROUP BY ${groupByExpr}
       )
       GROUP BY level ORDER BY level ASC`,
      params
    ).catch((e) => {
      console.error("Funnel error:", e);
      return [];
    });

    // Calculate cumulative counts: Step N count is the sum of all levels >= N
    const finalRows = steps.map((stepName, i) => {
      const level = i + 1;
      const count = rows.filter(r => r.level >= level).reduce((s, r) => s + Number(r.count), 0);
      return { label: stepName, count };
    });

    return {
      total: finalRows[0]?.count || 0,
      rows: finalRows
    };
  }

  if (type === "metric") {
    const eventName = String(config.eventName || "");
    const aggregation = String(config.aggregation || "uniq");
    const property = String(config.property || "");

    const isNative = property === "user_id" || property === "session_id";
    const extracted = isNative 
      ? property 
      : (aggregation === "uniq" 
         ? `JSONExtractString(properties, {property:String})` 
         : `JSONExtractFloat(properties, {property:String})`);

    let aggFunc = `uniq(${extracted})`;
    if (aggregation === "avg") aggFunc = `avg(${extracted})`;
    else if (aggregation === "p50") aggFunc = `quantile(0.5)(${extracted})`;
    else if (aggregation === "p95") aggFunc = `quantile(0.95)(${extracted})`;

    const rawParams: Record<string, any> = { tenantId, event: eventName, timeFrame, timezone: APP_TIMEZONE };
    if (!isNative) rawParams.property = property;

    const raw = await queryJson<{ day: string; count: string | number }>(
      `SELECT formatDateTime(ts, '%Y-%m-%d', {timezone:String}) AS day, ${aggFunc} AS count
       FROM events
       WHERE tenant_id = {tenantId:String}
         AND event = {event:String}
         AND ts >= now() - INTERVAL {timeFrame:Int32} DAY
         ${isNative ? `AND ${property} != ''` : ""}
       GROUP BY day ORDER BY day ASC`,
      rawParams
    ).catch((e) => {
      console.error("Metric raw error:", e);
      return [];
    });

    const filledRows = fillDays(raw, timeFrame);

    const totalParams: Record<string, any> = { tenantId, event: eventName, timeFrame };
    if (!isNative) totalParams.property = property;

    const totalRaw = await queryJson<{ total: string | number }>(
      `SELECT ${aggFunc} AS total FROM events
       WHERE tenant_id = {tenantId:String}
         AND event = {event:String}
         AND ts >= now() - INTERVAL {timeFrame:Int32} DAY
         ${isNative ? `AND ${property} != ''` : ""}`,
      totalParams
    ).catch((e) => {
      console.error("Metric total error:", e);
      return [];
    });
    
    // Some aggregations like quantiles or avg might return NaN/Null if no rows, so fallback to 0
    let total = Number(totalRaw[0]?.total);
    if (isNaN(total)) total = 0;

    return { total, rows: filledRows };
  }

  return { total: 0, rows: [] };
}
