import { Suspense } from "react";
import Image from "next/image";
import HeroCard from "@/components/HeroCard";
import StatTile from "@/components/StatTile";
import ConversionsChart from "@/components/ConversionsChart";
import CampaignBreakdown from "@/components/CampaignBreakdown";
import InsightCards from "@/components/InsightCards";
import RangePicker from "@/components/RangePicker";
import RefreshButton from "@/components/RefreshButton";
import SignOutButton from "@/components/SignOutButton";
import StatusBanner from "@/components/StatusBanner";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { requireSession } from "@/lib/auth";
import { PhoneIcon, FormIcon, PoundIcon, ReceiptIcon, VisitsIcon, PercentIcon } from "@/components/Icons";
import { getDashboardData } from "@/lib/dashboard";
import { DEFAULT_RANGE, isRangeId, resolveRange, PROPERTY_TIMEZONE, type ResolvedRange } from "@/lib/ranges";
import { PROPERTY_LABEL } from "@/lib/config";
import { buildInsights } from "@/lib/insights";
import { formatClock, formatDayLong, formatMoney, formatNumber, formatPercent } from "@/lib/format";

export default async function Home({ searchParams }: PageProps<"/">) {
  // Checked here as well as in the proxy, so nothing is fetched from Google
  // Analytics — let alone rendered — for someone who isn't signed in.
  await requireSession();

  const requested = (await searchParams).range;
  const rangeId = isRangeId(requested) ? requested : DEFAULT_RANGE;
  const range = resolveRange(rangeId);

  const periodText =
    range.days === 1 ? formatDayLong(range.start) : `${formatDayLong(range.start)} – ${formatDayLong(range.end)}`;

  return (
    <>
      {/* Sits above the page as it scrolls, so the range buttons are always a
          thumb away instead of a scroll back to the top. It renders without
          waiting for Google Analytics, so the page is never blank. */}
      <header className="sticky top-0 z-20 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="brand-rule" aria-hidden="true" />
        <div
          className="backdrop-blur-md px-4 pt-3 pb-2.5 sm:px-6"
          style={{ background: "color-mix(in srgb, var(--canvas) 88%, transparent)" }}
        >
          <div className="max-w-6xl mx-auto flex flex-col gap-2.5 min-w-0 w-full">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Image
                  src="/creations-logo.png"
                  alt="Creations"
                  width={300}
                  height={60}
                  priority
                  className="h-6 sm:h-7 w-auto shrink-0 rounded-[3px]"
                />
                {/* The logo already carries the brand name, so on narrow screens
                    the heading is left to screen readers and the space goes to
                    the period instead. */}
                <div className="min-w-0">
                  <h1 className="sr-only sm:not-sr-only text-[15px] sm:text-base font-semibold leading-tight truncate text-primary">
                    {PROPERTY_LABEL}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-muted truncate">
                    {range.label} · {periodText}
                  </p>
                </div>
              </div>
              {/* items-start, not center: the refresh button carries a status
                  line under it, and the two buttons should line up by their
                  tops rather than float against that extra height. */}
              <div className="flex items-start gap-2 shrink-0">
                <RefreshButton />
                <SignOutButton />
              </div>
            </div>

            <RangePicker active={rangeId} />
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto w-full flex flex-col gap-3 sm:gap-4 safe-bottom">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardBody range={range} />
        </Suspense>
      </main>
    </>
  );
}

async function DashboardBody({ range }: { range: ResolvedRange }) {
  const result = await getDashboardData(range);

  if (result.status === "error") {
    return (
      <StatusBanner tone="warning" title="Can't reach Google Analytics right now">
        <p>
          No numbers are being shown, because showing the wrong ones would be worse. This is usually temporary — please
          try again in a few minutes.
        </p>
        <p className="mt-1 text-muted">Technical detail: {result.error}</p>
      </StatusBanner>
    );
  }

  const { kpis, currency, comparisonLabel } = result;

  return (
    <>
      {result.status === "stale" ? (
        <StatusBanner tone="warning" title="Showing the last numbers we could fetch">
          Google Analytics did not respond just now, so these figures may be a few minutes behind.
        </StatusBanner>
      ) : null}

      {result.status === "sample" ? (
        <StatusBanner tone="warning" title="These are sample numbers, not your real data">
          Google Analytics could not be reached and the demo fallback is switched on. {result.error}
        </StatusBanner>
      ) : null}

      {range.includesToday ? (
        <StatusBanner tone="info" title="This period includes today">
          Today is still in progress, and ad spend can take a few hours to appear in Google Analytics.
        </StatusBanner>
      ) : null}

      <HeroCard data={result} />

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3" aria-label="Key numbers">
        <StatTile
          label="Phone calls"
          icon={PhoneIcon}
          value={formatNumber(kpis.calls.value)}
          deltaPct={kpis.calls.deltaPct}
          comparison={comparisonLabel}
          hint="Visitors who tapped your phone number."
        />
        <StatTile
          label="Form enquiries"
          icon={FormIcon}
          value={formatNumber(kpis.forms.value)}
          deltaPct={kpis.forms.deltaPct}
          comparison={comparisonLabel}
          hint="Visitors who went to your contact form."
        />
        <StatTile
          label="Ad spend"
          icon={PoundIcon}
          value={formatMoney(kpis.cost.value, currency)}
          deltaPct={kpis.cost.deltaPct}
          comparison={comparisonLabel}
          goodDirection="none"
          hint="Total paid to Google Ads in this period."
        />
        <StatTile
          label="Cost per enquiry"
          icon={ReceiptIcon}
          value={formatMoney(kpis.costPerConversion.value, currency, 2)}
          deltaPct={kpis.costPerConversion.deltaPct}
          comparison={comparisonLabel}
          goodDirection="down"
          hint="Ad spend divided by enquiries. Lower is better."
        />
        <StatTile
          label="Website visits"
          icon={VisitsIcon}
          value={formatNumber(kpis.sessions.value)}
          deltaPct={kpis.sessions.deltaPct}
          comparison={comparisonLabel}
          hint="Visits from every source, paid and free."
        />
        <StatTile
          label="Enquiry rate"
          icon={PercentIcon}
          value={formatPercent(kpis.enquiryRate.value)}
          deltaPct={kpis.enquiryRate.deltaPct}
          comparison={comparisonLabel}
          hint="Share of visits that ended in an enquiry."
        />
      </section>

      <ConversionsChart data={result.series} currency={currency} granularity={result.granularity} />

      <InsightCards insights={buildInsights(result)} />

      <CampaignBreakdown data={result.campaigns} currency={currency} />

      <footer className="text-[11px] leading-relaxed text-muted pt-1">
        <p>
          {result.status === "sample"
            ? "Sample data, shown for preview only."
            : `Live data from Google Analytics 4, in ${PROPERTY_TIMEZONE.replace("_", " ")} time. Updated at ${formatClock(result.fetchedAt, PROPERTY_TIMEZONE)}.`}{" "}
          An enquiry means someone tapped your phone number or opened your contact form.
        </p>
      </footer>
    </>
  );
}
