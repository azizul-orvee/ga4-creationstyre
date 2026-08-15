import type { CampaignRow } from "@/lib/types";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { MegaphoneIcon, PhoneIcon, FormIcon } from "./Icons";

type Props = { data: CampaignRow[]; currency: string };

export default function CampaignBreakdown({ data, currency }: Props) {
  const totals = data.reduce(
    (acc, row) => ({
      cost: acc.cost + row.cost,
      calls: acc.calls + row.calls,
      forms: acc.forms + row.forms,
      conversions: acc.conversions + row.conversions,
      sessions: acc.sessions + row.sessions,
    }),
    { cost: 0, calls: 0, forms: 0, conversions: 0, sessions: 0 },
  );
  const averageCpa = totals.conversions ? totals.cost / totals.conversions : 0;
  const maxConversions = Math.max(...data.map((row) => row.conversions), 1);

  return (
    <section className="card rounded-2xl border">
      <header className="flex items-start gap-2.5 px-4 pt-4 sm:px-5 sm:pt-5">
        <span className="icon-chip shrink-0 mt-0.5">
          <MegaphoneIcon size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight text-primary">Where the enquiries came from</h2>
          <p className="text-xs mt-1 leading-snug text-muted">
            {data.length > 0
              ? `What each campaign cost and what it brought in. Your average is ${formatMoney(averageCpa, currency, 2)} per enquiry.`
              : "No campaigns had spend or enquiries in this period."}
          </p>
        </div>
      </header>

      {/* Phones get cards, because a six-column table on a 380px screen is a
          sideways scroll nobody performs. Desktop keeps the table. */}
      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 flex flex-col gap-2.5 md:hidden">
        {data.map((row) => (
          <article key={row.campaign} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-semibold leading-snug text-primary break-words">{row.campaign}</h3>
              {row.isPaid ? null : (
                <span className="text-[10px] rounded-full px-2 py-0.5 shrink-0 text-secondary" style={{ background: "var(--surface-2)" }}>
                  Free traffic
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--gridline)" }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${(row.conversions / maxConversions) * 100}%`, background: "var(--series-3)" }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-primary">
                {formatNumber(row.conversions)} {row.conversions === 1 ? "enquiry" : "enquiries"}
              </span>
            </div>

            <dl className="grid grid-cols-3 gap-2 mt-3 text-center">
              <Stat label="Spend" value={row.cost > 0 ? formatMoney(row.cost, currency) : "—"} />
              <Stat
                label="Per enquiry"
                value={row.costPerConversion === null ? "—" : formatMoney(row.costPerConversion, currency, 2)}
                tone={row.costPerConversion === null ? undefined : row.costPerConversion <= averageCpa ? "good" : "bad"}
                note={row.costPerConversion === null ? undefined : row.costPerConversion <= averageCpa ? "below average" : "above average"}
              />
              <Stat label="Enquiry rate" value={row.enquiryRate === null ? "—" : formatPercent(row.enquiryRate)} />
            </dl>

            <div className="flex items-center gap-4 mt-2.5 text-[11px] text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <PhoneIcon size={13} />
                {formatNumber(row.calls)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FormIcon size={13} />
                {formatNumber(row.forms)}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block px-5 pb-5 pt-3">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--gridline)" }}>
                <Th align="left">Campaign</Th>
                <Th>Spend</Th>
                <Th>Visits</Th>
                <Th>Calls</Th>
                <Th>Forms</Th>
                <Th>Enquiries</Th>
                <Th>Enquiry rate</Th>
                <Th>Per enquiry</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.campaign} style={{ borderBottom: "1px solid var(--gridline)" }}>
                  <td className="py-2.5 pr-3 max-w-[240px]">
                    <div className="truncate text-primary" title={row.campaign}>
                      {row.campaign}
                    </div>
                    {row.isPaid ? null : <div className="text-[10px] text-muted">Free traffic — no ad spend</div>}
                  </td>
                  <Td>{row.cost > 0 ? formatMoney(row.cost, currency) : "—"}</Td>
                  <Td>{formatNumber(row.sessions)}</Td>
                  <Td>{formatNumber(row.calls)}</Td>
                  <Td>{formatNumber(row.forms)}</Td>
                  <td className="py-2.5 px-2 align-middle" style={{ minWidth: 110 }}>
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--gridline)" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${(row.conversions / maxConversions) * 100}%`, background: "var(--series-3)" }}
                        />
                      </div>
                      <span className="tabular-nums text-primary">{formatNumber(row.conversions)}</span>
                    </div>
                  </td>
                  <Td>{row.enquiryRate === null ? "—" : formatPercent(row.enquiryRate)}</Td>
                  <td className="py-2.5 pl-2 text-right tabular-nums whitespace-nowrap">
                    {row.costPerConversion === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <CostPerEnquiry value={row.costPerConversion} average={averageCpa} currency={currency} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-medium">
                <td className="py-2.5 pr-3 text-primary">Total</td>
                <Td bold>{formatMoney(totals.cost, currency)}</Td>
                <Td bold>{formatNumber(totals.sessions)}</Td>
                <Td bold>{formatNumber(totals.calls)}</Td>
                <Td bold>{formatNumber(totals.forms)}</Td>
                <Td bold>{formatNumber(totals.conversions)}</Td>
                <Td bold>{totals.sessions ? formatPercent((totals.conversions / totals.sessions) * 100) : "—"}</Td>
                <Td bold>{formatMoney(averageCpa, currency, 2)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone, note }: { label: string; value: string; tone?: "good" | "bad"; note?: string }) {
  const color = tone === "good" ? "var(--status-good)" : tone === "bad" ? "var(--status-critical)" : "var(--text-primary)";
  return (
    <div className="rounded-lg py-1.5 px-1" style={{ background: "var(--surface-2)" }}>
      <dt className="text-[10px] text-muted">{label}</dt>
      <dd className="text-[13px] font-semibold tabular-nums mt-0.5" style={{ color }}>
        {value}
      </dd>
      {/* The word is what carries the meaning; the colour only reinforces it. */}
      {note ? <dd className="text-[9px] text-muted leading-tight">{note}</dd> : null}
    </div>
  );
}

function CostPerEnquiry({ value, average, currency }: { value: number; average: number; currency: string }) {
  const good = value <= average;
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ color: good ? "var(--status-good)" : "var(--status-critical)" }}
      title={good ? "Below your average cost per enquiry" : "Above your average cost per enquiry"}
    >
      <span aria-hidden="true">{good ? "▾" : "▴"}</span>
      {formatMoney(value, currency, 2)}
      <span className="sr-only">{good ? " (below average)" : " (above average)"}</span>
    </span>
  );
}

function Th({ children, align = "right" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`font-medium py-2 text-muted ${align === "left" ? "text-left pr-3" : "text-right px-2"} whitespace-nowrap`}
    >
      {children}
    </th>
  );
}

function Td({ children, bold = false }: { children: React.ReactNode; bold?: boolean }) {
  return <td className={`py-2.5 px-2 text-right tabular-nums text-primary ${bold ? "font-medium" : ""}`}>{children}</td>;
}
