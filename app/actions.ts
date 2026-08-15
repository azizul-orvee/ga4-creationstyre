"use server";

import { revalidateTag } from "next/cache";

// A refresh drops the cached entry, so the next render goes back to GA4. That is
// a request anyone who can open the page can trigger, so it is rationed: without
// this, holding down the button would be a direct line to the API quota.
const MIN_GAP_MS = 30_000;
let lastRefresh = 0;

export type RefreshResult = { refreshed: boolean; waitSeconds?: number };

export async function refreshDashboard(): Promise<RefreshResult> {
  const since = Date.now() - lastRefresh;
  if (since < MIN_GAP_MS) {
    return { refreshed: false, waitSeconds: Math.ceil((MIN_GAP_MS - since) / 1000) };
  }

  lastRefresh = Date.now();
  // expire: 0 makes the next visit fetch fresh numbers rather than showing the
  // stale ones first, which is what someone pressing "refresh" is asking for.
  revalidateTag("dashboard", { expire: 0 });
  return { refreshed: true };
}
