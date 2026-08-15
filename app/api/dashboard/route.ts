import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { DEFAULT_RANGE, isRangeId, resolveRange } from "@/lib/ranges";
import { getSession } from "@/lib/auth";

// Same numbers as the page, as JSON. It shares the page's cache, so polling it
// costs no extra GA4 requests. It needs the same session cookie the page does:
// a route handler is a public URL, and the proxy in front of it is a
// convenience rather than the lock.
export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const requested = request.nextUrl.searchParams.get("range");
  const rangeId = isRangeId(requested) ? requested : DEFAULT_RANGE;
  const data = await getDashboardData(resolveRange(rangeId));

  return NextResponse.json(data, {
    status: data.status === "error" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
