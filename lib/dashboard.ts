import { unstable_cache } from "next/cache";
import { getMockDashboardData } from "./mockData";
import { getLiveDashboardData } from "./ga4";
import type { DashboardData } from "./types";
import { addDays, type ResolvedRange } from "./ranges";
import { SAMPLE_FALLBACK_ENABLED } from "./config";

// `unstable_cache` is deprecated in favour of the `use cache` directive, and is
// deliberately kept anyway. Plain `use cache` holds entries in each server
// instance's own memory, while this persists them across instances and
// deployments — and that is the whole point of the cache here: one shared entry
// per range means one GA4 call per range, however many people open the page.
// The equivalent under Cache Components is `use cache: remote`, so this should
// move only when `cacheComponents` is turned on and a remote cache handler is
// available. Swapping it for plain `use cache` would multiply the API calls.

export type DashboardStatus = "live" | "stale" | "sample" | "error";

export type DashboardResult =
  | ({ status: "live" } & DashboardData)
  // Last known good numbers, served because GA4 could not be reached just now.
  | ({ status: "stale"; error: string } & DashboardData)
  // Invented numbers. Only ever shown when explicitly switched on for a demo.
  | ({ status: "sample"; error: string } & DashboardData)
  | { status: "error"; error: string };

// Ranges that are already closed can be held far longer than ones still moving.
const TTL = {
  /** Covers today, so new enquiries should appear reasonably quickly. */
  live: 300,
  /** Ended yesterday: GA4 can still adjust yesterday's figures for a while. */
  recent: 6 * 3600,
  /** Ended before yesterday and will not change again. */
  settled: 24 * 3600,
};

function ttlFor(range: ResolvedRange) {
  if (range.includesToday) return TTL.live;
  return range.end >= addDays(range.today, -1) ? TTL.recent : TTL.settled;
}

// Kept in memory so an outage or a spent quota shows the last real numbers
// instead of an empty page. Per server instance and lost on redeploy, which is
// fine: it is a cushion, not the cache.
const lastGood = new Map<string, DashboardData>();

// While GA4 is failing, stop asking for a minute. Repeated failures otherwise
// burn through the "server errors per hour" allowance and delay recovery.
const RETRY_AFTER_FAILURE = 60_000;
let failingUntil = 0;

export async function getDashboardData(range: ResolvedRange): Promise<DashboardResult> {
  // The resolved dates are part of the cache key, so entries roll over on their
  // own at midnight rather than serving yesterday's "today".
  const key = `${range.id}:${range.start}:${range.end}`;
  const fetchCached = unstable_cache(async () => getLiveDashboardData(range), ["dashboard", key], {
    revalidate: ttlFor(range),
    tags: ["dashboard"],
  });

  const cushion = lastGood.get(key);
  if (Date.now() < failingUntil && cushion) {
    return { status: "stale", error: "Google Analytics is not responding.", ...cushion };
  }

  try {
    const data = await fetchCached();
    failingUntil = 0;
    lastGood.set(key, data);
    return { status: "live", ...data };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error fetching GA4 data";
    console.error("[dashboard] GA4 fetch failed:", err);
    failingUntil = Date.now() + RETRY_AFTER_FAILURE;

    if (cushion) return { status: "stale", error, ...cushion };

    // Sample numbers are opt-in. Showing invented enquiry counts on a client's
    // dashboard is worse than showing nothing, so the default is to say so.
    if (SAMPLE_FALLBACK_ENABLED) {
      return { status: "sample", error, ...getMockDashboardData(range) };
    }
    return { status: "error", error };
  }
}
