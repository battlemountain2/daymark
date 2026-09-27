import type { Forecast } from "./weather";
import { TZ } from "./localtime";

export const forecastTime = (iso: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit",
}).format(new Date(iso));

/** Keep nighttime lows alongside their preceding daytime forecast. */
export function dailyForecast(days: Forecast["days"]) {
  return days.flatMap((day, i) => {
    if (!day.isDaytime && i > 0) return [];
    const night = days[i + 1];
    return [{ ...day, high: day.isDaytime ? day.tempF : null,
      low: !day.isDaytime ? day.tempF : night && !night.isDaytime ? night.tempF : null }];
  }).slice(0, 7);
}

/** NWS can send '5 to 10 mph'; never turn that range into 510 mph. */
export function parseWindMph(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const speeds = value.match(/\d+(?:\.\d+)?/g)?.map(Number);
  return speeds?.length ? Math.max(...speeds) : /calm/i.test(value) ? 0 : null;
}
