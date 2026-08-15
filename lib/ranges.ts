// Date ranges are resolved in the GA4 property's own timezone. Resolving them
// against the server clock instead would put "today" on the wrong day whenever
// the server and the property disagree, which is most of the time on Vercel.

const TIMEZONE = process.env.GA4_TIMEZONE ?? "Europe/London";

/** The property's timezone, for anything that has to show a clock time. */
export const PROPERTY_TIMEZONE = TIMEZONE;

// Also the order the buttons appear in. The most-used ranges come first so the
// selected one is visible without scrolling the row on a phone.
export const RANGE_IDS = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "this-week",
  "last-week",
  "15d",
  "this-month",
  "last-month",
] as const;

export type RangeId = (typeof RANGE_IDS)[number];

export const DEFAULT_RANGE: RangeId = "30d";

export type ResolvedRange = {
  id: RangeId;
  label: string;
  /** Inclusive YYYY-MM-DD bounds, in the property timezone. */
  start: string;
  end: string;
  days: number;
  /** Same number of days, immediately before `start`. */
  prior: { start: string; end: string };
  /** A single day is shown hour by hour; anything longer is shown day by day. */
  granularity: "hour" | "day";
  includesToday: boolean;
  /** Today in the property timezone, so callers don't re-derive it. */
  today: string;
};

export const RANGE_LABELS: Record<RangeId, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  "last-week": "Last week",
  "7d": "Last 7 days",
  "15d": "Last 15 days",
  "30d": "Last 30 days",
  "this-month": "This month",
  "last-month": "Last month",
};

/** The label as it reads mid-sentence: "1,944 enquiries in the last 30 days". */
export const RANGE_PHRASES: Record<RangeId, string> = {
  today: "today",
  yesterday: "yesterday",
  "this-week": "this week",
  "last-week": "last week",
  "7d": "the last 7 days",
  "15d": "the last 15 days",
  "30d": "the last 30 days",
  "this-month": "this month",
  "last-month": "last month",
};

function todayIso() {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Whole-day arithmetic is done on a UTC anchor so daylight saving shifts can't
// add or drop a day.
function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, amount: number) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIso(date);
}

/** Inclusive day count between two ISO dates. */
export function daysBetween(start: string, end: string) {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / 86_400_000) + 1;
}

/** Weeks start on Monday. */
function startOfWeek(iso: string) {
  const dayOfWeek = toDate(iso).getUTCDay();
  return addDays(iso, -((dayOfWeek + 6) % 7));
}

function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonth(iso: string) {
  const firstOfNext = toDate(startOfMonth(iso));
  firstOfNext.setUTCMonth(firstOfNext.getUTCMonth() + 1);
  return addDays(toIso(firstOfNext), -1);
}

export function isRangeId(value: unknown): value is RangeId {
  return typeof value === "string" && (RANGE_IDS as readonly string[]).includes(value);
}

export function resolveRange(id: RangeId): ResolvedRange {
  const today = todayIso();
  const yesterday = addDays(today, -1);

  // Rolling windows end yesterday: today is still in progress and its ad spend
  // lags, so including it would always show a fake drop on the last bar.
  const bounds: Record<RangeId, { start: string; end: string }> = {
    today: { start: today, end: today },
    yesterday: { start: yesterday, end: yesterday },
    "this-week": { start: startOfWeek(today), end: today },
    "last-week": {
      start: addDays(startOfWeek(today), -7),
      end: addDays(startOfWeek(today), -1),
    },
    "7d": { start: addDays(yesterday, -6), end: yesterday },
    "15d": { start: addDays(yesterday, -14), end: yesterday },
    "30d": { start: addDays(yesterday, -29), end: yesterday },
    "this-month": { start: startOfMonth(today), end: today },
    "last-month": {
      start: startOfMonth(addDays(startOfMonth(today), -1)),
      end: endOfMonth(addDays(startOfMonth(today), -1)),
    },
  };

  const { start, end } = bounds[id];
  const days = daysBetween(start, end);

  return {
    id,
    label: RANGE_LABELS[id],
    start,
    end,
    days,
    prior: { start: addDays(start, -days), end: addDays(start, -1) },
    granularity: start === end ? "hour" : "day",
    includesToday: end >= today,
    today,
  };
}

export function comparisonLabel(range: ResolvedRange) {
  if (range.days === 1) return "vs the day before";
  if (range.days === 7) return "vs the previous week";
  return `vs the previous ${range.days} days`;
}
