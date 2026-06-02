import { queryJson } from "./clickhouse";
import { prisma } from "./prisma";
import { getEffectivePlan } from "./billing/plans";

export type DailyRow = { day: string; count: number };
export type BreakdownRow = { val: string; count: number };
export type FunnelRow = { level: number; count: number };

export interface InsightData {
  total: number;
  returning?: number;
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

const planCache = new Map<string, { plan: any; expiresAt: number }>();
const CACHE_TTL = 30 * 1000;

export async function fetchInsightData(
  tenantId: string,
  type: string,
  config: Record<string, any>
): Promise<InsightData> {
  let plan: any = "FREE";
  const cached = planCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    plan = cached.plan;
  } else {
    const ws = await prisma.workspace.findUnique({
      where: { tenantId },
      select: { plan: true },
    });
    plan = ws?.plan ?? "FREE";
    planCache.set(tenantId, { plan, expiresAt: Date.now() + CACHE_TTL });
  }

  const planConfig = getEffectivePlan(plan);
  const retentionDays = planConfig.dataRetentionDays || 30;

  const rawTimeFrame = Number(config.timeFrame || "7");
  const timeFrame = Math.min(rawTimeFrame, retentionDays);

  if (type === "count") {
    const eventName = String(config.eventName || "");
    const rows = await queryJson<{ total: string | number }>(
      `SELECT count() AS total FROM events
       WHERE tenant_id = {tenantId:String}
         AND event = {event:String}
         AND ts >= now() - INTERVAL {retentionDays:Int32} DAY`,
      { tenantId, event: eventName, retentionDays }
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
    // Sanitize: only allow word chars so we can safely inline in SQL
    const property = String(config.property || "").replace(/[^\w]/g, "");
    const breakdownDays = Math.min(30, retentionDays);
    const rows = await queryJson<BreakdownRow>(
      `SELECT 
          JSONExtractString(properties, '${property}') AS val,
          count() AS count
       FROM events
       WHERE tenant_id = {tenantId:String}
         AND event = {event:String}
         AND ts >= now() - INTERVAL {breakdownDays:Int32} DAY
         AND JSONExtractString(properties, '${property}') != ''
       GROUP BY val
       ORDER BY count DESC
       LIMIT 10`,
      { tenantId, event: eventName, breakdownDays }
    ).catch((e) => {
      console.error("Breakdown query error:", e?.message ?? e);
      return [] as BreakdownRow[];
    });

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
    // Sanitize and inline: same fix as metric/breakdown — {distinctId:String} inside
    // JSONExtractString() fails with the ClickHouse HTTP param substitution.
    const sanitizedDistinctId = distinctId.replace(/[^\w]/g, "");
    const groupByExpr = isNativeId
      ? sanitizedDistinctId
      : `JSONExtractString(properties, '${sanitizedDistinctId}')`;

    const stepConditions = steps.map((_, i) => `event = {step${i}:String}`).join(", ");

    const funnelDays = Math.min(30, retentionDays);
    const params: Record<string, any> = { tenantId, steps, funnelDays };
    steps.forEach((s, i) => params[`step${i}`] = s);

    const queryStr = `SELECT
          level,
          count() AS count
       FROM (
          SELECT
              windowFunnel(86400)(
                  toDateTime(ts),
                  ${stepConditions}
              ) AS level
          FROM events
          WHERE tenant_id = {tenantId:String}
            AND event IN {steps:Array(String)}
            AND ts >= now() - INTERVAL {funnelDays:Int32} DAY
          GROUP BY ${groupByExpr}
       )
       GROUP BY level ORDER BY level ASC`;

    const rows = await queryJson<FunnelRow>(queryStr, params).catch((e: any) => {
      console.error("Funnel query error:", e?.message ?? e);
      return [] as FunnelRow[];
    });

    // Cumulative counts: Step N = sum of all levels >= N
    const finalRows = steps.map((stepName, i) => {
      const level = i + 1;
      const count = rows
        .filter(r => Number(r.level) >= level)
        .reduce((s, r) => s + Number(r.count), 0);
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
    // Sanitize property name — only allow word chars (a-z, 0-9, _) to safely inline it in SQL.
    // This avoids ClickHouse parameterized-token failures inside JSONExtract* function arguments.
    const property = String(config.property || "").replace(/[^\w]/g, "");

    const isNative = property === "user_id" || property === "session_id";

    // Build the SQL expression for the target property.
    // We inline the sanitized property name directly rather than using {property:String} because
    // ClickHouse HTTP parameterized params do not reliably substitute inside JSONExtract* args.
    const extracted = isNative
      ? property
      : aggregation === "uniq"
        ? `JSONExtractString(properties, '${property}')`
        : `JSONExtractFloat(properties, '${property}')`;

    let aggFunc = `uniq(${extracted})`;
    if (aggregation === "avg")  aggFunc = `avg(${extracted})`;
    else if (aggregation === "p50") aggFunc = `quantile(0.5)(${extracted})`;
    else if (aggregation === "p95") aggFunc = `quantile(0.95)(${extracted})`;

    // Exclude events where the target property is missing:
    // JSONExtractFloat returns 0.0 and JSONExtractString returns '' for absent keys.
    const propertyFilter = isNative
      ? `AND ${property} != ''`
      : aggregation === "uniq"
        ? `AND JSONExtractString(properties, '${property}') != ''`
        : `AND JSONExtractFloat(properties, '${property}') != 0`;

    const baseParams: Record<string, any> = { tenantId, event: eventName, timeFrame };

    const raw = await queryJson<{ day: string; count: string | number }>(
      `SELECT formatDateTime(ts, '%Y-%m-%d', {timezone:String}) AS day, ${aggFunc} AS count
       FROM events
       WHERE tenant_id = {tenantId:String}
         AND event = {event:String}
         AND ts >= now() - INTERVAL {timeFrame:Int32} DAY
         ${propertyFilter}
       GROUP BY day ORDER BY day ASC`,
      { ...baseParams, timezone: APP_TIMEZONE }
    ).catch((e) => {
      console.error("Metric raw query error:", e?.message ?? e);
      return [] as { day: string; count: string | number }[];
    });

    const filledRows = fillDays(raw, timeFrame);

    const totalRaw = await queryJson<{ total: string | number }>(
      `SELECT ${aggFunc} AS total
       FROM events
       WHERE tenant_id = {tenantId:String}
         AND event = {event:String}
         AND ts >= now() - INTERVAL {timeFrame:Int32} DAY
         ${propertyFilter}`,
      baseParams
    ).catch((e) => {
      console.error("Metric total query error:", e?.message ?? e);
      return [] as { total: string | number }[];
    });

    // quantile/avg return NaN when there are no matching rows — fall back to 0.
    let total = Number(totalRaw[0]?.total);
    if (isNaN(total)) total = 0;

    return { total, rows: filledRows };
  }

  if (type === "retention") {
    const startEvent = String(config.startEvent || "");
    const returnEvent = String(config.returnEvent || "");
    const distinctIdRaw = String(config.distinctId || "session_id");
    const timeFrame = 7;
    
    if (!startEvent || !returnEvent) return { total: 0, rows: [] };

    const isNativeId = distinctIdRaw === "user_id" || distinctIdRaw === "session_id";
    // Sanitize and inline — same fix applied to all JSONExtract* argument parameters
    const sanitizedId = distinctIdRaw.replace(/[^\w]/g, "");
    const distinctId = isNativeId
      ? sanitizedId
      : `JSONExtractString(properties, '${sanitizedId}')`;

    const daySelectors = Array.from({ length: timeFrame }, (_, i) => {
      const day = i + 1;
      return `count(DISTINCT IF(dateDiff('day', cohort_date, action_date) = ${day}, user_id, NULL)) AS day_${day}`;
    }).join(",\n          ");

    // No distinctId param needed anymore — it's inlined safely above
    const params: Record<string, any> = { tenantId, startEvent, returnEvent, timeFrame, retentionDays };

    const cohortQueryStr = `
      SELECT
          formatDateTime(cohort_date, '%Y-%m-%d') AS cohort,
          count(DISTINCT user_id) AS size,
          ${daySelectors}
      FROM (
          SELECT
              ${distinctId} AS user_id,
              minIf(toDate(ts, '${APP_TIMEZONE}'), event = {startEvent:String}) AS cohort_date,
              groupArrayIf(toDate(ts, '${APP_TIMEZONE}'), event = {returnEvent:String}) AS return_dates
          FROM events
          WHERE tenant_id = {tenantId:String}
            AND (event = {startEvent:String} OR event = {returnEvent:String})
            AND ts >= now() - INTERVAL {timeFrame:Int32} DAY
            AND ${distinctId} != ''
          GROUP BY user_id
      )
      LEFT ARRAY JOIN return_dates AS action_date
      WHERE cohort_date IS NOT NULL
      GROUP BY cohort_date
      ORDER BY cohort_date ASC
    `;

    const allTimeQueryStr = `
      SELECT
          count(DISTINCT user_id) AS all_time_users,
          count(DISTINCT IF(last_return > cohort_date, user_id, NULL)) AS returning_users
      FROM (
          SELECT
              ${distinctId} AS user_id,
              minIf(toDate(ts, '${APP_TIMEZONE}'), event = {startEvent:String}) AS cohort_date,
              maxIf(toDate(ts, '${APP_TIMEZONE}'), event = {returnEvent:String}) AS last_return
          FROM events
          WHERE tenant_id = {tenantId:String}
            AND (event = {startEvent:String} OR event = {returnEvent:String})
            AND ts >= now() - INTERVAL {retentionDays:Int32} DAY
            AND ${distinctId} != ''
          GROUP BY user_id
      )
      WHERE cohort_date IS NOT NULL
    `;

    const [raw, allTimeRaw] = await Promise.all([
      queryJson<any>(cohortQueryStr, params).catch((e) => {
        console.error("Retention cohort error:", e);
        return [];
      }),
      queryJson<any>(allTimeQueryStr, params).catch((e) => {
        console.error("Retention all-time error:", e);
        return [];
      })
    ]);

    const rows = raw.map(r => {
      const days = [Number(r.size)];
      for (let i = 1; i <= timeFrame; i++) {
        days.push(Number(r[`day_${i}`] || 0));
      }
      return { cohort: r.cohort, size: Number(r.size), days };
    });

    // Ensure we fill in empty days
    const resultRows = [];
    for (let i = timeFrame - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: APP_TIMEZONE, 
        year: 'numeric', month: '2-digit', day: '2-digit' 
      }).format(d);

      const existing = rows.find(r => r.cohort === dateStr);
      if (existing) {
        resultRows.push(existing);
      } else {
        const emptyDays = [0];
        for (let j = 1; j <= timeFrame; j++) emptyDays.push(0);
        resultRows.push({ cohort: dateStr, size: 0, days: emptyDays });
      }
    }

    const total = Number(allTimeRaw[0]?.all_time_users || 0);
    const returning = Number(allTimeRaw[0]?.returning_users || 0);
    
    return { total, returning, rows: resultRows };
  }

  return { total: 0, rows: [] };
}
