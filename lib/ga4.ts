import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { protos } from "@google-analytics/data";
import path from "path";
import fs from "fs";
import type { DashboardData, TimePoint, CampaignRow, Kpi } from "./types";
import { addDays, comparisonLabel, daysBetween, type ResolvedRange } from "./ranges";
import { CALL_EVENT, FORM_EVENT, PROPERTY_LABEL } from "./config";

type RunReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest;
type RunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;
type Row = protos.google.analytics.data.v1beta.IRow;

const TIMEZONE = process.env.GA4_TIMEZONE ?? "Europe/London";

function getClient() {
  // Preferred for deployment (e.g. Vercel): paste the whole JSON key into
  // GA4_SERVICE_ACCOUNT_KEY_JSON as an env var — no file needed.
  const inlineJson = process.env.GA4_SERVICE_ACCOUNT_KEY_JSON;
  if (inlineJson) {
    const credentials = JSON.parse(inlineJson);
    return new BetaAnalyticsDataClient({ credentials });
  }

  // Fallback for local dev: a path to the key file on disk.
  const keyPath = process.env.GA4_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error("Set GA4_SERVICE_ACCOUNT_KEY_JSON (recommended) or GA4_SERVICE_ACCOUNT_KEY_PATH");
  }
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), /* turbopackIgnore: true */ keyPath);
  if (!fs.existsSync(resolved)) throw new Error(`GA4 service account key not found at ${resolved}`);
  return new BetaAnalyticsDataClient({ keyFilename: resolved });
}

// The client opens a gRPC channel and caches an auth token, so it is worth
// keeping between requests instead of rebuilding it on every page render.
let cachedClient: BetaAnalyticsDataClient | undefined;
function client() {
  cachedClient ??= getClient();
  return cachedClient;
}

function propertyPath() {
  const id = process.env.GA4_PROPERTY_ID;
  if (!id) throw new Error("GA4_PROPERTY_ID is not set");
  return `properties/${id}`;
}

function kpi(curr: number, prev: number): Kpi {
  return { value: curr, deltaPct: prev ? ((curr - prev) / prev) * 100 : null };
}

/** GA4 returns dates as "20260814". */
function isoDate(raw: string) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/** Campaign names GA4 uses for traffic that isn't a paid campaign. */
function isPaidCampaign(name: string) {
  return !name.startsWith("(") && name !== "" && name.toLowerCase() !== "(not set)";
}

const CURRENT = "current";
const PRIOR = "prior";

type ReportName = "series" | "campaigns" | "spendSeries" | "campaignEvents";

const conversionEventFilter = {
  filter: {
    fieldName: "eventName",
    inListFilter: { values: [CALL_EVENT, FORM_EVENT] },
  },
};

/** Reads rows by column *name* rather than position. With more than one date
 *  range GA4 appends a "dateRange" column of its own, so fixed indexes drift. */
function reader(report: RunReportResponse | undefined, { comparesPeriods = false } = {}) {
  const dims = new Map((report?.dimensionHeaders ?? []).map((h, i) => [h.name ?? "", i]));
  const metrics = new Map((report?.metricHeaders ?? []).map((h, i) => [h.name ?? "", i]));
  const rows = report?.rows ?? [];

  // A report asked for two date ranges must come back with the column that says
  // which range a row belongs to. Without it the two periods would be summed
  // into one number and the dashboard would quietly overstate every total, so
  // this fails loudly instead and the page shows its "can't reach GA4" state.
  if (rows.length && comparesPeriods && !dims.has("dateRange")) {
    throw new Error("GA4 returned a multi-period report without a dateRange column");
  }

  // GA4 caps every report at `limit` rows and reports the true total, so a
  // truncated report is the one way these numbers can silently go missing.
  const total = Number(report?.rowCount ?? rows.length);
  if (total > rows.length) {
    console.warn(`[ga4] report truncated: showing ${rows.length} of ${total} rows — raise the limit`);
  }

  return {
    rows,
    dim: (row: Row, name: string) => row.dimensionValues?.[dims.get(name) ?? -1]?.value ?? "",
    num: (row: Row, name: string) => Number(row.metricValues?.[metrics.get(name) ?? -1]?.value ?? 0),
  };
}

export async function getLiveDashboardData(range: ResolvedRange): Promise<DashboardData> {
  const property = propertyPath();
  const hourly = range.granularity === "hour";
  const timeDimension = hourly ? "hour" : "date";

  const current = { startDate: range.start, endDate: range.end, name: CURRENT };
  const prior = { startDate: range.prior.start, endDate: range.prior.end, name: PRIOR };

  // Everything the page needs, sent as ONE batched API call instead of one call
  // per report. batchRunReports takes up to 5 reports, and both the concurrent
  // request limit (10 per property) and the retry budget are counted per call —
  // so batching is what keeps a page load from costing seven slots.
  //
  // Where a report can answer two questions, it does: the current *and* prior
  // period are asked for together as two date ranges rather than as two reports.
  const requests: RunReportRequest[] = [
    // 0 — enquiries over time, and (by summing) the headline totals for both periods.
    {
      dateRanges: [current, prior],
      dimensions: [{ name: timeDimension }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: conversionEventFilter,
      limit: 2000,
      returnPropertyQuota: true,
    },
    // 1 — per-campaign spend and traffic for both periods. Also the source of
    // total ad spend and total visits, so no separate totals report is needed.
    {
      dateRanges: [current, prior],
      dimensions: [{ name: "sessionCampaignName" }],
      metrics: [{ name: "advertiserAdCost" }, { name: "advertiserAdClicks" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "advertiserAdCost" }, desc: true }],
      limit: 250,
    },
    // 2 — spend per day, for the spend strip under the chart. GA4 refuses
    // advertiserAdCost unless sessionCampaignName is in the request, so daily
    // spend has to be summed from campaign rows; the metric filter keeps free
    // traffic out of a report that only exists to total up money. Cost is not
    // available per hour at all, so single-day views skip this entirely.
    ...(hourly
      ? []
      : [
          {
            dateRanges: [current],
            dimensions: [{ name: "date" }, { name: "sessionCampaignName" }],
            metrics: [{ name: "advertiserAdCost" }],
            metricFilter: {
              filter: {
                fieldName: "advertiserAdCost",
                numericFilter: { operation: "GREATER_THAN" as const, value: { doubleValue: 0 } },
              },
            },
            limit: 2000,
          } satisfies RunReportRequest,
        ]),
    // 3 — enquiries per campaign. Cost and eventName can't share a request, so
    // these are joined onto the spend rows by campaign name below.
    {
      dateRanges: [current],
      dimensions: [{ name: "sessionCampaignName" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: conversionEventFilter,
      limit: 500,
    },
  ];

  const [batch] = await client().batchRunReports({ property, requests });
  const reports = batch.reports ?? [];

  // Reports come back in request order. Naming them here keeps the indexes from
  // shifting when the spend report is skipped on single-day views.
  const order: ReportName[] = hourly
    ? ["series", "campaigns", "campaignEvents"]
    : ["series", "campaigns", "spendSeries", "campaignEvents"];
  const report = (name: ReportName) => reports[order.indexOf(name)];

  logQuota(report("series"));
  warnOnTimezoneMismatch(report("series"));

  const currency = report("series")?.metadata?.currencyCode ?? "GBP";

  // ---- enquiries over time, and headline totals ----------------------------
  const buckets = new Map<string, TimePoint>();
  for (const key of bucketKeys(range)) {
    buckets.set(key, { key, calls: 0, forms: 0, cost: hourly ? null : 0 });
  }

  const currentTotals = { calls: 0, forms: 0 };
  const priorTotals = { calls: 0, forms: 0 };

  const seriesRows = reader(report("series"), { comparesPeriods: true });
  for (const row of seriesRows.rows) {
    const isCurrent = seriesRows.dim(row, "dateRange") !== PRIOR;
    const event = seriesRows.dim(row, "eventName");
    const count = seriesRows.num(row, "eventCount");
    const totals = isCurrent ? currentTotals : priorTotals;

    if (event === CALL_EVENT) totals.calls += count;
    else if (event === FORM_EVENT) totals.forms += count;
    else continue;

    // Only the current period is charted; the prior one exists for the deltas.
    if (!isCurrent) continue;
    const raw = seriesRows.dim(row, timeDimension);
    // GA4 pads a two-date-range report with cross-product rows: dates from the
    // prior range, labelled as the current one, always with a zero count. The
    // seeded buckets are exactly the days this range should show, so anything
    // landing outside them is that padding and is dropped rather than charted.
    const point = buckets.get(hourly ? raw.padStart(2, "0") : isoDate(raw));
    if (!point) continue;
    if (event === CALL_EVENT) point.calls += count;
    else point.forms += count;
  }

  const curr = { ...currentTotals, total: currentTotals.calls + currentTotals.forms };
  const prev = { ...priorTotals, total: priorTotals.calls + priorTotals.forms };

  // ---- spend and traffic per campaign -------------------------------------
  const campaignMap = new Map<string, CampaignRow>();
  const touchCampaign = (name: string) => {
    let row = campaignMap.get(name);
    if (!row) {
      row = {
        campaign: name,
        cost: 0,
        clicks: 0,
        sessions: 0,
        calls: 0,
        forms: 0,
        conversions: 0,
        costPerConversion: null,
        enquiryRate: null,
        isPaid: isPaidCampaign(name),
      };
      campaignMap.set(name, row);
    }
    return row;
  };

  let cost = 0;
  let priorCost = 0;
  let sessions = 0;
  let priorSessions = 0;

  const campaignRows = reader(report("campaigns"), { comparesPeriods: true });
  for (const row of campaignRows.rows) {
    const rowCost = campaignRows.num(row, "advertiserAdCost");
    const rowSessions = campaignRows.num(row, "sessions");

    if (campaignRows.dim(row, "dateRange") === PRIOR) {
      priorCost += rowCost;
      priorSessions += rowSessions;
      continue;
    }

    cost += rowCost;
    sessions += rowSessions;
    const target = touchCampaign(campaignRows.dim(row, "sessionCampaignName") || "(not set)");
    target.cost += rowCost;
    target.clicks += campaignRows.num(row, "advertiserAdClicks");
    target.sessions += rowSessions;
  }

  const eventRows = reader(report("campaignEvents"));
  for (const row of eventRows.rows) {
    const target = touchCampaign(eventRows.dim(row, "sessionCampaignName") || "(not set)");
    const event = eventRows.dim(row, "eventName");
    const count = eventRows.num(row, "eventCount");
    if (event === CALL_EVENT) target.calls += count;
    else if (event === FORM_EVENT) target.forms += count;
  }

  if (!hourly) {
    const spendRows = reader(report("spendSeries"));
    for (const row of spendRows.rows) {
      const point = buckets.get(isoDate(spendRows.dim(row, "date")));
      if (!point) continue;
      point.cost = (point.cost ?? 0) + spendRows.num(row, "advertiserAdCost");
    }
  }

  // Seeded in order by bucketKeys, so the map's insertion order is the chart's.
  const series = [...buckets.values()];

  const campaigns = [...campaignMap.values()]
    .map((row) => {
      const conversions = row.calls + row.forms;
      return {
        ...row,
        conversions,
        costPerConversion: row.cost > 0 && conversions > 0 ? row.cost / conversions : null,
        enquiryRate: row.sessions > 0 ? (conversions / row.sessions) * 100 : null,
      };
    })
    // Sources with neither spend nor conversions are noise on a client report.
    .filter((row) => row.cost > 0 || row.conversions > 0)
    .sort((a, b) => b.cost - a.cost || b.conversions - a.conversions);

  const costPerConversion = curr.total ? cost / curr.total : 0;
  const priorCostPerConversion = prev.total ? priorCost / prev.total : 0;
  const enquiryRate = sessions ? (curr.total / sessions) * 100 : 0;
  const priorEnquiryRate = priorSessions ? (prev.total / priorSessions) * 100 : 0;

  return {
    propertyLabel: PROPERTY_LABEL,
    currency,
    range: {
      id: range.id,
      label: range.label,
      start: range.start,
      end: range.end,
      days: range.days,
      includesToday: range.includesToday,
    },
    comparisonLabel: comparisonLabel(range),
    granularity: range.granularity,
    kpis: {
      conversions: kpi(curr.total, prev.total),
      calls: kpi(curr.calls, prev.calls),
      forms: kpi(curr.forms, prev.forms),
      cost: kpi(cost, priorCost),
      costPerConversion: kpi(costPerConversion, priorCostPerConversion),
      sessions: kpi(sessions, priorSessions),
      enquiryRate: kpi(enquiryRate, priorEnquiryRate),
    },
    series,
    campaigns,
    fetchedAt: new Date().toISOString(),
  };
}

/** Every bucket the range should show, so quiet days and hours stay visible as
 *  gaps instead of being silently dropped from the chart. */
function bucketKeys(range: ResolvedRange): string[] {
  if (range.granularity === "hour") {
    return Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
  }
  const total = daysBetween(range.start, range.end);
  return Array.from({ length: total }, (_, i) => addDays(range.start, i));
}

/** GA4 charges every call against an hourly and a daily token budget. Printing
 *  what is left makes a slow leak obvious in the logs long before reports start
 *  failing with RESOURCE_EXHAUSTED. */
function logQuota(report: RunReportResponse | undefined) {
  const quota = report?.propertyQuota;
  if (!quota) return;
  const left = (q?: { consumed?: number | null; remaining?: number | null } | null) =>
    q ? `${q.consumed ?? 0} used, ${q.remaining ?? "?"} left` : "n/a";
  console.info(
    `[ga4] quota — day: ${left(quota.tokensPerDay)} · hour: ${left(quota.tokensPerHour)} · ` +
      `project/hour: ${left(quota.tokensPerProjectPerHour)} · concurrent: ${left(quota.concurrentRequests)}`,
  );
}

/** The dashboard resolves "today" in GA4_TIMEZONE. If that disagrees with the
 *  property, every range is silently off by a day. */
function warnOnTimezoneMismatch(report: RunReportResponse | undefined) {
  const propertyZone = report?.metadata?.timeZone;
  if (propertyZone && propertyZone !== TIMEZONE) {
    console.warn(
      `[ga4] GA4_TIMEZONE is "${TIMEZONE}" but the property reports "${propertyZone}". ` +
        `Set GA4_TIMEZONE=${propertyZone} so date ranges line up with GA4.`,
    );
  }
}
