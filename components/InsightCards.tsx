import { INSIGHT_ICONS } from "./Icons";
import type { Insight } from "@/lib/insights";

/** Short, plain-English observations pulled out of the numbers already on the
 *  page — the "so what" a client would otherwise have to work out themselves. */
export default function InsightCards({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {insights.map((insight) => {
        const Icon = INSIGHT_ICONS[insight.kind];
        const alert = insight.kind === "warning";
        return (
          <div key={insight.title} className="card rounded-2xl border p-4 flex items-start gap-3">
            <span
              className="icon-chip shrink-0"
              style={alert ? { background: "var(--status-warning-bg)", color: "var(--status-warning)" } : undefined}
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold leading-snug text-primary break-words">{insight.title}</h3>
              <p className="text-xs mt-1 leading-relaxed text-secondary">{insight.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
