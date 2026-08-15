import { DeltaChip } from "./StatTile";
import { PhoneIcon, FormIcon } from "./Icons";
import { formatNumber } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import { headline } from "@/lib/insights";

/** The one number the dashboard leads with, plus a sentence saying what it
 *  means, so the page answers "how are we doing?" before any scrolling. */
export default function HeroCard({ data }: { data: DashboardData }) {
  const { kpis, comparisonLabel } = data;
  const total = kpis.conversions.value;
  const calls = kpis.calls.value;
  const forms = kpis.forms.value;
  const callShare = total ? (calls / total) * 100 : 0;

  return (
    <section className="card rounded-2xl border p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-medium text-secondary">Total enquiries</h2>
          <div className="text-[52px] sm:text-[64px] font-semibold leading-[1.05] tracking-tight text-primary">
            {formatNumber(total)}
          </div>
        </div>
        <div className="pt-1">
          <DeltaChip deltaPct={kpis.conversions.deltaPct} goodDirection="up" comparison={comparisonLabel} size="md" />
        </div>
      </div>

      <p className="text-sm leading-relaxed text-secondary">{headline(data)}</p>

      {total > 0 ? (
        <div className="flex flex-col gap-2 pt-1">
          {/* 2px surface gap between the two fills, same as the chart's stacks. */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px]" aria-hidden="true">
            <div style={{ width: `${callShare}%`, background: "var(--series-1)" }} />
            <div style={{ width: `${100 - callShare}%`, background: "var(--series-2)" }} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <PhoneIcon size={14} className="text-calls" />
              {formatNumber(calls)} phone {calls === 1 ? "call" : "calls"}
              <span className="text-muted">({Math.round(callShare)}%)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FormIcon size={14} className="text-forms" />
              {formatNumber(forms)} form {forms === 1 ? "enquiry" : "enquiries"}
              <span className="text-muted">({Math.round(100 - callShare)}%)</span>
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
