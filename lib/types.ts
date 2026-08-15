// A conversion for this business is one of two things: a visitor tapping the
// phone number (call_click) or tapping through to the contact form
// (form_click). Both are already marked as key events in GA4.

import type { RangeId } from "./ranges";

export type TimePoint = {
  /** "2026-08-14" for daily buckets, "00".."23" for hourly ones. */
  key: string;
  calls: number;
  forms: number;
  /** null on hourly buckets: GA4 cannot break ad cost down by hour. */
  cost: number | null;
};

export type CampaignRow = {
  campaign: string;
  cost: number;
  clicks: number;
  sessions: number;
  calls: number;
  forms: number;
  conversions: number;
  /** null when the source is free traffic, where cost per conversion is meaningless. */
  costPerConversion: number | null;
  /** Enquiries per 100 visits from this campaign. null when it had no visits. */
  enquiryRate: number | null;
  isPaid: boolean;
};

/** deltaPct is null when the prior period had nothing to compare against. */
export type Kpi = { value: number; deltaPct: number | null };

export type DashboardData = {
  propertyLabel: string;
  currency: string;
  range: {
    id: RangeId;
    label: string;
    start: string;
    end: string;
    days: number;
    includesToday: boolean;
  };
  comparisonLabel: string;
  granularity: "hour" | "day";
  kpis: {
    conversions: Kpi;
    calls: Kpi;
    forms: Kpi;
    cost: Kpi;
    costPerConversion: Kpi;
    /** Website visits, so enquiries can be read as a share of traffic. */
    sessions: Kpi;
    /** Enquiries per 100 visits. */
    enquiryRate: Kpi;
  };
  series: TimePoint[];
  campaigns: CampaignRow[];
  /** When the numbers were last pulled from GA4, for the "updated" line. */
  fetchedAt: string;
};
