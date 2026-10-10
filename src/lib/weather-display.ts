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

/** Positions within the shared weekly temperature scale, including flat/missing data. */
export function temperatureRange(low:number|null,high:number|null,min:number,max:number) {
  if(low==null||high==null||!Number.isFinite(min)||!Number.isFinite(max))return null;
  const span=Math.max(1,max-min);
  const left=Math.max(0,Math.min(100,(low-min)/span*100));
  const right=Math.max(left,Math.min(100,(high-min)/span*100));
  return {left,width:Math.max(3,right-left)};
}

/** A cached station reading is current for 90 minutes; otherwise show a labeled forecast. */
export function weatherSnapshot(weather: Partial<Forecast>, now: number) {
  const hours = (weather.hours ?? []).filter(h => Date.parse(h.time) + 3600000 > now);
  const currentHour = hours[0], period = weather.days?.[0], observation = weather.current;
  const timestamp = observation?.observedAt ? Date.parse(observation.observedAt) : NaN;
  const age = now - timestamp;
  const observed = observation?.tempF != null && Number.isFinite(age) && age >= -10 * 60000 && age <= 90 * 60000;
  return {
    hours, currentHour, period,
    source: observed ? "observation" as const : currentHour || period ? "forecast" as const : "unavailable" as const,
    temperature: observed ? observation.tempF : currentHour?.tempF ?? period?.tempF ?? null,
    sky: observed ? observation.sky ?? currentHour?.shortForecast ?? null : currentHour?.shortForecast ?? period?.shortForecast ?? null,
    wind: observed ? observation.windMph : currentHour?.windMph ?? null,
    direction: observed ? observation.windDir : currentHour?.windDir ?? null,
    humidity: observed ? observation.humidity : currentHour?.humidity ?? null,
    observationStale: observation?.tempF != null && (!Number.isFinite(age) || age > 90 * 60000),
    observedAt: observed ? observation.observedAt : null,
  };
}

/** Meteorological bearing: the direction the wind comes from. */
export function windBearing(direction?: string | null): number | null {
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = points.indexOf((direction ?? "").toUpperCase());
  return index < 0 ? null : index * 22.5;
}
