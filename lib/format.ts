export function formatMoney(value: number, currency: string, decimals = 0) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumber(value: number) {
  return value.toLocaleString("en-GB");
}

export function formatPercent(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/** "2026-08-14" -> "14 Aug" */
export function formatDayShort(iso: string) {
  const [, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}

/** "2026-08-14" -> "14 Aug 2026" */
export function formatDayLong(iso: string) {
  const [y] = iso.split("-");
  return `${formatDayShort(iso)} ${y}`;
}

/** "2026-08-14" -> "Fri" */
export function formatWeekdayShort(iso: string) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

/** Clock time in the business's own timezone, for the "updated at" line. Passed
 *  the zone explicitly so it renders the same on the server and the client. */
export function formatClock(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
