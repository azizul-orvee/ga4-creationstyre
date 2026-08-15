"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RANGE_IDS, RANGE_LABELS, DEFAULT_RANGE, type RangeId } from "@/lib/ranges";

type Props = { active: RangeId };

export default function RangePicker({ active }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Highlights the tapped option straight away; React reverts it by itself if
  // the navigation fails.
  const [selected, setSelected] = useOptimistic(active);

  const scroller = useRef<HTMLDivElement>(null);
  const activeButton = useRef<HTMLButtonElement>(null);

  // On a narrow screen the row scrolls, and the selected range may start out of
  // sight. Nudging the row (rather than calling scrollIntoView, which would also
  // scroll the page) brings it into view without moving anything else.
  useEffect(() => {
    const row = scroller.current;
    const button = activeButton.current;
    if (!row || !button) return;

    // Measured against the row's own box: offsetLeft would be relative to the
    // nearest positioned ancestor, which is not this scroller. When the pill is
    // out of view it gets centred, so it lands clear of both edges rather than
    // flush against one of them.
    const rowBox = row.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    const clear = buttonBox.left >= rowBox.left + 8 && buttonBox.right <= rowBox.right - 8;
    if (clear) return;

    row.scrollLeft += buttonBox.left - rowBox.left - (rowBox.width - buttonBox.width) / 2;
  }, [selected]);

  function select(id: RangeId) {
    if (id === active) return;
    startTransition(() => {
      setSelected(id);
      router.push(id === DEFAULT_RANGE ? "/" : `/?range=${id}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        ref={scroller}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5"
        role="group"
        aria-label="Date range"
        style={{ opacity: isPending ? 0.65 : 1, transition: "opacity 120ms" }}
      >
        {RANGE_IDS.map((id) => {
          const isActive = id === selected;
          return (
            <button
              key={id}
              ref={isActive ? activeButton : undefined}
              type="button"
              onClick={() => select(id)}
              aria-pressed={isActive}
              // h-9 keeps every pill a comfortable thumb target.
              className="h-9 shrink-0 text-[13px] rounded-full px-3.5 border transition-colors whitespace-nowrap cursor-pointer"
              style={{
                borderColor: isActive ? "var(--series-1)" : "var(--border)",
                background: isActive ? "var(--series-1)" : "var(--surface-1)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {RANGE_LABELS[id]}
            </button>
          );
        })}
      </div>

      <span className="sr-only" aria-live="polite">
        {isPending ? "Loading new date range" : ""}
      </span>
    </div>
  );
}
