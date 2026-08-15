import { TrendUpIcon, TrendDownIcon, EqualIcon } from "./Icons";

/** Which way is good news. Spend on its own is neither good nor bad. */
export type GoodDirection = "up" | "down" | "none";

type Props = {
  label: string;
  hint: string;
  value: string;
  deltaPct: number | null;
  /** e.g. "vs the previous 30 days" — depends on the selected range. */
  comparison: string;
  goodDirection?: GoodDirection;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export default function StatTile({ label, hint, value, deltaPct, comparison, goodDirection = "up", icon: Icon }: Props) {
  return (
    <div className="card rounded-2xl border p-3.5 sm:p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="icon-chip shrink-0" style={{ width: 24, height: 24, borderRadius: 7 }}>
          <Icon size={14} />
        </span>
        <span className="text-[13px] font-medium leading-tight text-secondary">{label}</span>
      </div>

      {/* Proportional figures: tabular-nums pads digits to a zero's width, which
          looks gappy at this size. It is kept for the table columns instead. */}
      {/* Tracking left alone for the same reason as the hero figure: negative
          spacing collides the flag of Space Grotesk's 1 with the digit before it. */}
      <div className="font-heading text-[26px] sm:text-[28px] font-bold leading-none text-primary">{value}</div>

      <DeltaChip deltaPct={deltaPct} goodDirection={goodDirection} comparison={comparison} />

      <p className="text-[11px] leading-snug text-muted mt-0.5">{hint}</p>
    </div>
  );
}

export function DeltaChip({
  deltaPct,
  goodDirection,
  comparison,
  size = "sm",
}: {
  deltaPct: number | null;
  goodDirection: GoodDirection;
  comparison: string;
  size?: "sm" | "md";
}) {
  if (deltaPct === null || !Number.isFinite(deltaPct)) {
    return <div className="text-[11px] text-muted">No earlier period to compare</div>;
  }

  const flat = Math.abs(deltaPct) < 0.5;
  const isUp = deltaPct >= 0;
  const isGood = goodDirection === "none" || flat ? null : (isUp && goodDirection === "up") || (!isUp && goodDirection === "down");

  const palette =
    isGood === null
      ? { fg: "var(--text-secondary)", bg: "var(--surface-2)" }
      : isGood
        ? { fg: "var(--status-good)", bg: "var(--status-good-bg)" }
        : { fg: "var(--status-critical)", bg: "var(--status-critical-bg)" };

  // The arrow carries the direction as well as the colour, so the meaning
  // survives colour blindness and greyscale printing.
  const Arrow = flat ? EqualIcon : isUp ? TrendUpIcon : TrendDownIcon;
  const text = flat ? "Level" : `${Math.abs(deltaPct).toFixed(deltaPct < 10 ? 1 : 0)}%`;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold tabular-nums ${
          size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5"
        }`}
        style={{ color: palette.fg, background: palette.bg }}
      >
        <Arrow size={size === "md" ? 14 : 12} strokeWidth={2.25} />
        {text}
      </span>
      <span className={`${size === "md" ? "text-xs" : "text-[11px]"} text-muted`}>{comparison}</span>
    </div>
  );
}
