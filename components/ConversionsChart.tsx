"use client";

import { useRef, useState } from "react";
import type { TimePoint } from "@/lib/types";
import { formatDayShort, formatMoney, formatNumber, formatWeekdayShort } from "@/lib/format";
import { ChartIcon } from "./Icons";

type Props = {
  data: TimePoint[];
  currency: string;
  granularity: "hour" | "day";
};

export default function ConversionsChart({ data, currency, granularity }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const columnsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const hourly = granularity === "hour";
  const peak = Math.max(...data.map((d) => d.calls + d.forms), 1);
  // Round the top of the scale up to something with clean ticks.
  const niceMax = Math.max(4, Math.ceil(peak / 4) * 4);
  const ticks = [0, 0.5, 1].map((f) => Math.round(niceMax * f));

  const spend = data.map((d) => d.cost ?? 0);
  const maxSpend = Math.max(...spend, 0);
  const showSpend = !hourly && maxSpend > 0;

  const totals = data.reduce(
    (acc, d) => ({ calls: acc.calls + d.calls, forms: acc.forms + d.forms }),
    { calls: 0, forms: 0 },
  );

  // Roughly six labels, whatever the length of the range.
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const labelFor = (point: TimePoint) => (hourly ? `${point.key}:00` : formatDayShort(point.key));
  const longLabelFor = (point: TimePoint) =>
    hourly ? `${point.key}:00–${point.key}:59` : `${formatWeekdayShort(point.key)} ${formatDayShort(point.key)}`;

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(data.length - 1, Math.max(0, (active ?? 0) + step));
    setActive(next);
    columnsRef.current[next]?.focus();
  }

  const selected = active !== null ? data[active] : null;

  return (
    <section className="card rounded-2xl border p-4 sm:p-5">
      <header className="flex items-start gap-2.5 mb-1">
        <span className="icon-chip shrink-0 mt-0.5">
          <ChartIcon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-tight text-primary">
            {hourly ? "Enquiries by hour" : "Enquiries per day"}
          </h2>
          <p className="text-xs mt-1 leading-snug text-muted">
            {hourly ? "Each bar is one hour." : "Each bar is one day."} Tap a bar to see that{" "}
            {hourly ? "hour" : "day"} in detail.
          </p>
        </div>
      </header>

      {/* Legend: identity never rests on colour alone. */}
      <div className="flex items-center gap-4 text-xs mb-3 text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: "var(--series-1)" }} />
          Phone calls
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: "var(--series-2)" }} />
          Form enquiries
        </span>
      </div>

      <div className="flex gap-2.5">
        <div
          className="flex flex-col justify-between text-right text-[10px] tabular-nums text-muted h-[190px] sm:h-[230px] shrink-0"
          aria-hidden="true"
        >
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="relative h-[190px] sm:h-[230px]"
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKeyDown}
            role="group"
            aria-label={`${hourly ? "Enquiries by hour" : "Enquiries per day"}. ${formatNumber(totals.calls + totals.forms)} in total.`}
          >
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t pointer-events-none"
                style={{
                  bottom: `${(tick / niceMax) * 100}%`,
                  borderColor: tick === 0 ? "var(--baseline)" : "var(--gridline)",
                }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-[2px]">
              {data.map((point, i) => {
                const stacked = point.calls + point.forms;
                const dim = active !== null && active !== i;
                const both = point.calls > 0 && point.forms > 0;

                return (
                  <button
                    key={point.key}
                    type="button"
                    ref={(node) => {
                      columnsRef.current[i] = node;
                    }}
                    // Roving tabindex: one stop for the whole chart, then arrow
                    // keys walk it, rather than 30 tab stops on a 30-day range.
                    tabIndex={i === (active ?? 0) ? 0 : -1}
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    aria-label={`${longLabelFor(point)}: ${stacked} ${stacked === 1 ? "enquiry" : "enquiries"}`}
                    className="flex-1 min-w-0 h-full flex flex-col justify-end cursor-default focus:outline-none"
                    style={{ opacity: dim ? 0.45 : 1, transition: "opacity 120ms" }}
                  >
                    <span className="w-full max-w-[24px] mx-auto flex flex-col justify-end h-full">
                      {point.forms > 0 ? (
                        <span
                          className="w-full rounded-t-[4px]"
                          style={{ height: `${(point.forms / niceMax) * 100}%`, background: "var(--series-2)" }}
                        />
                      ) : null}
                      {/* 2px of surface between the two fills, so they read as
                          separate without a border drawn around either. */}
                      {both ? <span className="w-full shrink-0" style={{ height: 2 }} /> : null}
                      {point.calls > 0 ? (
                        <span
                          className="w-full"
                          style={{
                            height: `${(point.calls / niceMax) * 100}%`,
                            background: "var(--series-1)",
                            borderRadius: point.forms === 0 ? "4px 4px 0 0" : 0,
                          }}
                        />
                      ) : null}
                      {stacked === 0 ? (
                        <span className="w-full rounded-[2px]" style={{ height: 2, background: "var(--gridline)" }} />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {selected ? <Tooltip point={selected} index={active!} count={data.length} label={longLabelFor(selected)} currency={currency} /> : null}
          </div>

          {showSpend ? (
            <div className="mt-2">
              <div className="flex items-end gap-[2px] h-[26px]" aria-hidden="true">
                {data.map((point, i) => (
                  <span key={point.key} className="flex-1 min-w-0 h-full flex items-end" style={{ opacity: active !== null && active !== i ? 0.45 : 1 }}>
                    <span
                      className="w-full max-w-[24px] mx-auto rounded-t-[2px]"
                      style={{
                        height: `${maxSpend ? Math.max(((point.cost ?? 0) / maxSpend) * 100, point.cost ? 6 : 0) : 0}%`,
                        background: "var(--seq-250)",
                      }}
                    />
                  </span>
                ))}
              </div>
              <p className="text-[10px] mt-1 text-muted">
                Ad spend per day · peak {formatMoney(maxSpend, currency)}
              </p>
            </div>
          ) : null}

          {/* Labels are positioned over the plot rather than sitting in a
              column each: a 30-day range gives each column ~10px, which would
              chop "16 Jul" down to "1". */}
          <div className="relative h-4 mt-1.5" aria-hidden="true">
            {data.map((point, i) => {
              if (i % labelStep !== 0) return null;
              const centre = ((i + 0.5) / data.length) * 100;
              return (
                <span
                  key={point.key}
                  className="absolute top-0 text-[10px] text-muted whitespace-nowrap"
                  style={{
                    left: `${centre}%`,
                    transform: centre < 8 ? "translateX(0)" : centre > 92 ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {labelFor(point)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* The same numbers as a table, for screen readers and anyone who would
          rather read the values than the bars. */}
      <table className="sr-only">
        <caption>{hourly ? "Enquiries by hour" : "Enquiries per day"}</caption>
        <thead>
          <tr>
            <th scope="col">{hourly ? "Hour" : "Day"}</th>
            <th scope="col">Phone calls</th>
            <th scope="col">Form enquiries</th>
            {showSpend ? <th scope="col">Ad spend</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{longLabelFor(point)}</th>
              <td>{point.calls}</td>
              <td>{point.forms}</td>
              {showSpend ? <td>{formatMoney(point.cost ?? 0, currency)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Tooltip({
  point,
  index,
  count,
  label,
  currency,
}: {
  point: TimePoint;
  index: number;
  count: number;
  label: string;
  currency: string;
}) {
  const total = point.calls + point.forms;
  // Nudge the box in at the ends so it never hangs off a narrow screen.
  const position = index < count * 0.2 ? "left" : index > count * 0.8 ? "right" : "centre";
  const transform =
    position === "left" ? "translateX(0)" : position === "right" ? "translateX(-100%)" : "translateX(-50%)";

  return (
    <div
      className="absolute top-1 pointer-events-none rounded-lg border px-2.5 py-1.5 text-[11px] leading-relaxed shadow-sm whitespace-nowrap z-10"
      style={{
        left: `${((index + 0.5) / count) * 100}%`,
        transform,
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
      role="status"
    >
      <div className="font-semibold text-primary">{label}</div>
      <div className="text-secondary tabular-nums">
        {total} {total === 1 ? "enquiry" : "enquiries"}
      </div>
      <div className="flex items-center gap-1.5 text-secondary tabular-nums">
        <span className="inline-block w-2 h-2 rounded-[2px]" style={{ background: "var(--series-1)" }} />
        {point.calls} calls
        <span className="inline-block w-2 h-2 rounded-[2px] ml-1" style={{ background: "var(--series-2)" }} />
        {point.forms} forms
      </div>
      {point.cost !== null && point.cost > 0 ? (
        <div className="text-muted tabular-nums">{formatMoney(point.cost, currency)} ad spend</div>
      ) : null}
    </div>
  );
}
