import { AlertIcon, InfoIcon } from "./Icons";

type Tone = "warning" | "info";

export default function StatusBanner({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children?: React.ReactNode;
}) {
  const Icon = tone === "warning" ? AlertIcon : InfoIcon;
  const colors =
    tone === "warning"
      ? { fg: "var(--status-warning)", bg: "var(--status-warning-bg)" }
      : { fg: "var(--chip-fg)", bg: "var(--chip-bg)" };

  return (
    <div className="rounded-xl px-3.5 py-3 flex items-start gap-2.5" style={{ background: colors.bg }} role="status">
      <span className="shrink-0 mt-0.5" style={{ color: colors.fg }}>
        <Icon size={16} />
      </span>
      <div className="min-w-0 text-xs leading-relaxed">
        <p className="font-semibold text-primary">{title}</p>
        {children ? <div className="text-secondary mt-0.5">{children}</div> : null}
      </div>
    </div>
  );
}
