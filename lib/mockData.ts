// Sample data shaped exactly like the live GA4 response, used only when the
// live fetch fails so the dashboard still renders something sensible.

import type { DashboardData, TimePoint, CampaignRow } from "./types";
import { addDays, comparisonLabel, daysBetween, type ResolvedRange } from "./ranges";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getMockDashboardData(range: ResolvedRange): DashboardData {
  const rand = seededRandom(42);
  const hourly = range.granularity === "hour";

  const series: TimePoint[] = [];
  if (hourly) {
    for (let h = 0; h < 24; h++) {
      // Enquiries cluster around working hours.
      const busy = h >= 7 && h <= 20 ? 1 : 0.1;
      series.push({
        key: String(h).padStart(2, "0"),
        calls: Math.round(rand() * 6 * busy),
        forms: Math.round(rand() * 5 * busy),
        cost: null,
      });
    }
  } else {
    const total = daysBetween(range.start, range.end);
    for (let i = 0; i < total; i++) {
      const key = addDays(range.start, i);
      const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
      const weekendDip = weekday === 0 || weekday === 6 ? 0.55 : 1;
      series.push({
        key,
        calls: Math.round((26 + (rand() - 0.5) * 18) * weekendDip),
        forms: Math.round((22 + (rand() - 0.5) * 16) * weekendDip),
        cost: Math.round((760 + (rand() - 0.5) * 420) * weekendDip),
      });
    }
  }

  const calls = series.reduce((s, p) => s + p.calls, 0);
  const forms = series.reduce((s, p) => s + p.forms, 0);
  const conversions = calls + forms;
  // Hourly buckets carry no cost, so fall back to a plausible daily figure.
  const cost = hourly ? conversions * 11.5 : series.reduce((s, p) => s + (p.cost ?? 0), 0);

  const share = conversions || 1;
  const rawCampaigns = [
    { campaign: "AM - Hot Areas", weight: 0.29, cost: 0.36 },
    { campaign: "PM - Main All Keywords", weight: 0.29, cost: 0.29 },
    { campaign: "DAY - Main All Keywords", weight: 0.29, cost: 0.29 },
    { campaign: "AM - New Campaign", weight: 0.02, cost: 0.03 },
    { campaign: "(organic)", weight: 0.08, cost: 0 },
    { campaign: "(direct)", weight: 0.03, cost: 0 },
  ];

  const campaigns: CampaignRow[] = rawCampaigns
    .map((c) => {
      const rowConversions = Math.round(share * c.weight);
      const rowCalls = Math.round(rowConversions * 0.52);
      const rowCost = Math.round(cost * c.cost);
      // Free sources have no spend to size their traffic from, so scale their
      // visits off the enquiries they brought in instead.
      const rowSessions = rowCost > 0 ? Math.round(rowCost / 4.3) : rowConversions * 22;
      return {
        campaign: c.campaign,
        cost: rowCost,
        clicks: Math.round(rowCost / 4),
        sessions: rowSessions,
        calls: rowCalls,
        forms: rowConversions - rowCalls,
        conversions: rowConversions,
        costPerConversion: rowCost > 0 && rowConversions > 0 ? rowCost / rowConversions : null,
        enquiryRate: rowSessions > 0 ? (rowConversions / rowSessions) * 100 : null,
        isPaid: !c.campaign.startsWith("("),
      };
    })
    .sort((a, b) => b.cost - a.cost || b.conversions - a.conversions);

  const sessions = campaigns.reduce((total, row) => total + row.sessions, 0);

  return {
    propertyLabel: "Sample data (not your live account)",
    currency: "GBP",
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
      conversions: { value: conversions, deltaPct: 12.4 },
      calls: { value: calls, deltaPct: 8.1 },
      forms: { value: forms, deltaPct: 18.6 },
      cost: { value: cost, deltaPct: 6.2 },
      costPerConversion: { value: conversions ? cost / conversions : 0, deltaPct: -5.5 },
      sessions: { value: sessions, deltaPct: 9.3 },
      enquiryRate: { value: sessions ? (conversions / sessions) * 100 : 0, deltaPct: 2.8 },
    },
    series,
    campaigns,
    fetchedAt: new Date().toISOString(),
  };
}
