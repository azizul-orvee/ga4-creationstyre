// Hand-rolled inline SVGs rather than an icon package: a dashboard this size
// does not need another dependency, and inline icons cost no extra request on a
// phone. All of them inherit the surrounding text colour.

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function Svg({ size = 20, className, strokeWidth = 1.75, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </Svg>
  );
}

export function FormIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </Svg>
  );
}

export function PoundIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 7c0-5.33-8-5.33-8 0" />
      <path d="M10 7v7" />
      <path d="M6 21h12" />
      <path d="M6 13h8" />
      <path d="M10 14a4 4 0 0 1-2.5 7" />
    </Svg>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22V2l-2.5 1.5L14 2l-2.5 1.5L9 2 6.5 3.5Z" />
      <path d="M8 8h7" />
      <path d="M8 12h7" />
      <path d="M8 16h4" />
    </Svg>
  );
}

export function VisitsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function PercentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 5 5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </Svg>
  );
}

export function TrendUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </Svg>
  );
}

export function TrendDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m22 17-8.5-8.5-5 5L2 7" />
      <path d="M16 17h6v-6" />
    </Svg>
  );
}

export function EqualIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 9h14" />
      <path d="M5 15h14" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 2.7 5.5 6 .9-4.35 4.24 1.03 6-5.38-2.83L6.62 19.6l1.03-6L3.3 9.4l6-.9Z" />
    </Svg>
  );
}

export function AwardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="9" r="6" />
      <path d="m15.5 13.9 1.5 8.1-5-3-5 3 1.5-8.1" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </Svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 15v3" />
      <path d="M12 9v9" />
      <path d="M17 5v13" />
    </Svg>
  );
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3 11 18-6v14l-18-5Z" />
      <path d="M3 11v3" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </Svg>
  );
}

export function TyreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v5.5" />
      <path d="M12 15.5V21" />
      <path d="m3 12 5.5 0" />
      <path d="M15.5 12H21" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Svg>
  );
}

/** Maps an insight's `kind` to the icon that goes with it. */
export const INSIGHT_ICONS = {
  clock: ClockIcon,
  calendar: CalendarIcon,
  star: StarIcon,
  value: AwardIcon,
  warning: AlertIcon,
} as const;
