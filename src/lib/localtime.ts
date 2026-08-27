/**
 * Local-day arithmetic that survives daylight saving.
 *
 * Everything on this dashboard is anchored to Brayan's day, not to UTC and not
 * to the browser's guess. Both of these ask the zone about a specific instant
 * rather than assuming a fixed offset, so the two switch days a year come out
 * right instead of being an hour off.
 */

export const TZ = "America/Denver";

/** How far the zone sits from UTC at this instant, in milliseconds. */
export function zoneOffsetMs(ms: number, tz: string = TZ): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(ms));
  // "2026-08-21, 13:04:05" — and some engines emit hour 24 for midnight.
  const iso = parts.replace(", ", "T").replace("T24:", "T00:") + "Z";
  return ms - Date.parse(iso);
}

/** The UTC instant at which the local calendar day began. */
export function localMidnightUtcMs(now: Date, tz: string = TZ): number {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const asUtcMidnight = Date.parse(`${ymd}T00:00:00Z`);
  return asUtcMidnight + zoneOffsetMs(asUtcMidnight, tz);
}

/** Minutes elapsed since local midnight. */
export function minutesIntoLocalDay(now: Date, tz: string = TZ): number {
  return Math.floor((now.getTime() - localMidnightUtcMs(now, tz)) / 60000);
}

/** Today, at a given number of minutes past local midnight. */
export function atLocalMinutes(now: Date, minutes: number, tz: string = TZ): Date {
  return new Date(localMidnightUtcMs(now, tz) + minutes * 60000);
}

export const clockAt = (d: Date | null, tz: string = TZ): string =>
  d
    ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d)
    : "—";

/** Whole days between two YYYY-MM-DD strings, calendar-wise. */
export function daysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split("-").map(Number);
  const [by, bm, bd] = bIso.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** "Monday, Aug 25" from a YYYY-MM-DD string, read as a calendar date. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC", weekday: "long", month: "short", day: "numeric",
  });
}
