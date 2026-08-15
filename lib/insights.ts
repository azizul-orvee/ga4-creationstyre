// Everything here is worked out from data the dashboard has already fetched, so
// none of it costs an extra GA4 request.

import type { CampaignRow, DashboardData, TimePoint } from "./types";
import { formatDayShort, formatMoney, formatNumber } from "./format";
import { RANGE_PHRASES } from "./ranges";

export type Insight = {
  /** Which icon the card should use. */
  kind: "clock" | "calendar" | "star" | "value" | "warning";
  title: string;
  detail: string;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function total(point: TimePoint) {
  return point.calls + point.forms;
}

function weekdayOf(iso: string) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** The plain-English line at the top of the page. Written so the client can read
 *  one sentence and know whether the month is going well. */
export function headline(data: DashboardData): string {
  const { kpis, currency, range } = data;
  const enquiries = kpis.conversions.value;
  const period = RANGE_PHRASES[range.id];

  if (enquiries === 0) {
    return `No enquiries came in ${period}.`;
  }

  const parts: string[] = [];
  const perDay = enquiries / range.days;
  const word = enquiries === 1 ? "enquiry" : "enquiries";

  parts.push(`${formatNumber(enquiries)} ${word} ${period === "today" || period === "yesterday" ? "" : "in "}${period}`);

  if (range.days > 1) {
    parts.push(`about ${perDay < 1 ? perDay.toFixed(1) : Math.round(perDay)} a day`);
  }

  if (kpis.cost.value > 0 && kpis.costPerConversion.value > 0) {
    parts.push(`at ${formatMoney(kpis.costPerConversion.value, currency, 2)} each in ad spend`);
  }

  const delta = kpis.conversions.deltaPct;
  const trend =
    delta === null || !Number.isFinite(delta)
      ? ""
      : Math.abs(delta) < 2
        ? ` That is roughly level with ${data.comparisonLabel.replace(/^vs /, "")}.`
        : ` That is ${Math.abs(delta).toFixed(0)}% ${delta > 0 ? "more" : "fewer"} than ${data.comparisonLabel.replace(/^vs /, "")}.`;

  return `${parts.join(", ")}.${trend}`;
}

/** Which day of the week brings the most enquiries — the one number that tells
 *  a fitting business when to have someone free to answer the phone. */
export function busiestWeekday(series: TimePoint[]): Insight | null {
  if (series.length < 7) return null;

  const byDay = WEEKDAYS.map(() => ({ sum: 0, days: 0 }));
  for (const point of series) {
    const bucket = byDay[weekdayOf(point.key)];
    bucket.sum += total(point);
    bucket.days += 1;
  }

  const averages = byDay.map((b, i) => ({ day: i, avg: b.days ? b.sum / b.days : 0, days: b.days }));
  const covered = averages.filter((a) => a.days > 0);
  if (covered.length < 3) return null;

  const best = covered.reduce((a, b) => (b.avg > a.avg ? b : a));
  const overall = covered.reduce((sum, a) => sum + a.avg, 0) / covered.length;
  if (best.avg === 0) return null;

  const lift = overall > 0 ? ((best.avg - overall) / overall) * 100 : 0;
  const lead =
    lift >= 15
      ? `${Math.round(lift)}% busier than an average day`
      : "only a little busier than the rest of the week";

  return {
    kind: "calendar",
    title: `${WEEKDAYS[best.day]}s are your busiest`,
    detail: `${best.avg.toFixed(1)} enquiries on a typical ${WEEKDAYS[best.day]} — ${lead}.`,
  };
}

/** For the single-day view: when the phone actually rings. */
export function busiestHours(series: TimePoint[]): Insight | null {
  const busy = series.filter((p) => total(p) > 0);
  if (busy.length < 2) return null;

  // Best three-hour window, which reads more usefully than a single spike hour.
  let bestStart = 0;
  let bestSum = -1;
  for (let start = 0; start <= series.length - 3; start++) {
    const sum = series.slice(start, start + 3).reduce((s, p) => s + total(p), 0);
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }
  if (bestSum <= 0) return null;

  const from = series[bestStart].key;
  const to = String(Number(series[bestStart + 2].key) + 1).padStart(2, "0");
  const share = Math.round((bestSum / series.reduce((s, p) => s + total(p), 0)) * 100);

  return {
    kind: "clock",
    title: `Busiest between ${from}:00 and ${to}:00`,
    detail: `${bestSum} of the day's enquiries — ${share}% of the total — came in during those three hours.`,
  };
}

/** The single best day in the period, so a good week has something to point at. */
export function bestDay(series: TimePoint[], granularity: "hour" | "day"): Insight | null {
  if (granularity === "hour" || series.length < 2) return null;
  const best = series.reduce((a, b) => (total(b) > total(a) ? b : a));
  if (total(best) === 0) return null;

  return {
    kind: "star",
    title: `Best day: ${formatDayShort(best.key)}`,
    detail: `${total(best)} enquiries — ${best.calls} phone ${best.calls === 1 ? "call" : "calls"} and ${best.forms} form ${best.forms === 1 ? "enquiry" : "enquiries"}.`,
  };
}

/** Cheapest and most expensive campaigns, which is where the client can act. */
export function campaignValue(campaigns: CampaignRow[], currency: string): Insight[] {
  // A couple of conversions is not enough to call a campaign good or bad.
  const rated = campaigns.filter((c) => c.isPaid && c.cost > 0 && c.conversions >= 3 && c.costPerConversion !== null);
  if (rated.length < 2) return [];

  const sorted = [...rated].sort((a, b) => a.costPerConversion! - b.costPerConversion!);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const totalCost = rated.reduce((s, c) => s + c.cost, 0);
  const totalConversions = rated.reduce((s, c) => s + c.conversions, 0);
  const average = totalConversions ? totalCost / totalConversions : 0;

  const insights: Insight[] = [
    {
      kind: "value",
      title: `Best value: ${best.campaign}`,
      detail: `${formatMoney(best.costPerConversion!, currency, 2)} per enquiry from ${formatMoney(best.cost, currency)} spent.`,
    },
  ];

  // Only worth flagging when it is meaningfully worse than the rest.
  if (worst !== best && average > 0 && worst.costPerConversion! > average * 1.4) {
    const times = worst.costPerConversion! / average;
    insights.push({
      kind: "warning",
      title: `Most expensive: ${worst.campaign}`,
      detail: `${formatMoney(worst.costPerConversion!, currency, 2)} per enquiry — ${times.toFixed(1)}× the ${formatMoney(average, currency, 2)} average across your campaigns.`,
    });
  }

  return insights;
}

export function buildInsights(data: DashboardData): Insight[] {
  const list: Insight[] = [];
  const timing = data.granularity === "hour" ? busiestHours(data.series) : busiestWeekday(data.series);
  if (timing) list.push(timing);

  const peak = bestDay(data.series, data.granularity);
  if (peak) list.push(peak);

  list.push(...campaignValue(data.campaigns, data.currency));
  return list.slice(0, 4);
}
