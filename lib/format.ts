// Display formatting shared by server and client components. Everything
// is pinned to Pakistan time (Asia/Karachi, UTC+5, no DST): pages that
// render on the server would otherwise show Vercel's UTC clock in US
// month/day order, which is wrong for a Lahore business.

const TZ = "Asia/Karachi";
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const longDateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const hourFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "numeric",
  hourCycle: "h23",
});

export function formatRs(amount: number | null | undefined): string {
  return `Rs ${Number(amount ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFmt.format(new Date(value));
}

export function formatDate(value: string | Date): string {
  return dateFmt.format(new Date(value));
}

export function formatLongDate(value: string | Date = new Date()): string {
  return longDateFmt.format(new Date(value));
}

export function greeting(now: Date = new Date()): string {
  const hour = Number(hourFmt.format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Midnight (00:00) of the current day in Pakistan time, as an instant.
export function startOfTodayPakistan(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + PKT_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - PKT_OFFSET_MS);
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
