import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { DEFAULT_RANGE, isRangeId, resolveRange } from "@/lib/ranges";

// Same numbers as the page, as JSON. It shares the page's cache, so polling it
// costs no extra GA4 requests — but it is also unauthenticated, like the page
// itself. Put both behind auth before sharing the URL widely.
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("range");
  const rangeId = isRangeId(requested) ? requested : DEFAULT_RANGE;
  const data = await getDashboardData(resolveRange(rangeId));

  return NextResponse.json(data, {
    status: data.status === "error" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
