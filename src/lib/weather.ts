/**
 * Weather, from api.weather.gov.
 *
 * Worth knowing why this file exists: the artifact version of this dashboard
 * scraped forecast.weather.gov's HTML page, which turned out to serve data two
 * days stale, and api.weather.gov was unreachable from that context because its
 * robots.txt blocks crawlers. From a server that restriction doesn't apply —
 * this is the documented, supported client path. It is free and needs no key.
 *
 * NWS does ask that you identify yourself with a User-Agent. They will
 * rate-limit or block anonymous traffic, so NWS_USER_AGENT is not optional.
 */

export type Forecast = {
  place: string;
  updated: string;
  current: {
    tempF: number | null;
    sky: string | null;
    humidity: number | null;
    windMph: number | null;
    windDir: string | null;
    observedAt: string | null;
  };
  days: Array<{
    name: string;
    isDaytime: boolean;
    tempF: number;
    shortForecast: string;
    detailed: string;
    precipChance: number | null;
  }>;
  /** Hour by hour, about 6½ days of it. NWS returns ~156 periods. */
  hours: Array<{
    time: string;
    tempF: number;
    precipChance: number;
    humidity: number | null;
    windMph: number | null;
    windDir: string | null;
    shortForecast: string;
    isDaytime: boolean;
  }>;
};

const UA = () => process.env.NWS_USER_AGENT || "daymark (set NWS_USER_AGENT)";

async function nws<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA(), Accept: "application/geo+json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`NWS ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

const dirName = (deg: number | null): string | null => {
  if (deg == null) return null;
  const p = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return p[Math.round((deg % 360) / 22.5) % 16];
};

const cToF = (c: number | null): number | null => (c == null ? null : Math.round((c * 9) / 5 + 32));

export async function getForecast(lat: string, lon: string): Promise<Forecast> {
  // /points is stable for a given coordinate; cache it hard.
  const points = await nws<any>(`https://api.weather.gov/points/${lat},${lon}`, 60 * 60 * 24 * 7);
  const place =
    [points?.properties?.relativeLocation?.properties?.city,
     points?.properties?.relativeLocation?.properties?.state]
      .filter(Boolean).join(", ") || "Albuquerque, NM";

  const EMPTY: Forecast["current"] = {
    tempF: null, sky: null, humidity: null, windMph: null, windDir: null, observedAt: null,
  };

  // Everything below /points is independent, so it goes out at once. Run
  // sequentially and this is four round-trips deep; the page used to wait on
  // all of them before rendering a class schedule that needs no network at all.
  const [forecast, hourly, current] = await Promise.all([
    nws<any>(points.properties.forecast, 60 * 30),
    nws<any>(points.properties.forecastHourly, 60 * 30).catch(() => null),
    (async (): Promise<Forecast["current"]> => {
      const stations = await nws<any>(points.properties.observationStations, 60 * 60 * 24 * 7);
      const first = stations?.features?.[0]?.id;
      if (!first) return EMPTY;
      const obs = await nws<any>(`${first}/observations/latest`, 60 * 10);
      const p = obs?.properties ?? {};
      return {
        tempF: cToF(p.temperature?.value ?? null),
        sky: p.textDescription ?? null,
        humidity: p.relativeHumidity?.value == null ? null : Math.round(p.relativeHumidity.value),
        windMph: p.windSpeed?.value == null ? null : Math.round(p.windSpeed.value * 0.621371),
        windDir: dirName(p.windDirection?.value ?? null),
        observedAt: p.timestamp ?? null,
      };
      // An observation gap is normal; the forecast still stands on its own.
    })().catch(() => EMPTY),
  ]);

  const hours = (hourly?.properties?.periods ?? []).slice(0, 96).map((p: any) => ({
    time: p.startTime,
    tempF: p.temperature,
    precipChance: p.probabilityOfPrecipitation?.value ?? 0,
    humidity: p.relativeHumidity?.value ?? null,
    windMph: parseInt(String(p.windSpeed ?? "").replace(/\D+/g, ""), 10) || null,
    windDir: p.windDirection ?? null,
    shortForecast: p.shortForecast,
    isDaytime: !!p.isDaytime,
  }));

  const days = (forecast?.properties?.periods ?? []).slice(0, 8).map((p: any) => ({
    name: p.name,
    isDaytime: !!p.isDaytime,
    tempF: p.temperature,
    shortForecast: p.shortForecast,
    detailed: p.detailedForecast,
    precipChance: p.probabilityOfPrecipitation?.value ?? null,
  }));

  return {
    place,
    updated: forecast?.properties?.updated ?? new Date().toISOString(),
    current, days, hours,
  };
}

/** Sunrise/sunset, computed rather than fetched — no network, never stale. */
export function sunTimes(lat: number, lon: number, date = new Date(), tz = "America/Denver") {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const zenith = 90.833;
  const rad = Math.PI / 180;

  const calc = (rising: boolean): Date | null => {
    const lngHour = lon / 15;
    const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634;
    L = ((L % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad;
    RA = ((RA % 360) + 360) % 360;
    RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
    RA /= 15;
    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null; // sun never rises/sets here today
    const H = (rising ? 360 - Math.acos(cosH) / rad : Math.acos(cosH) / rad) / 15;
    // The longitude correction is not optional — dropping it shifts every
    // result by lon/15 hours, which put Albuquerque's sunrise at 11:24 PM.
    const T = H + RA - 0.06571 * t - 6.622;
    const UT = (((T - lngHour) % 24) + 24) % 24;
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCMinutes(d.getUTCMinutes() + Math.round(UT * 60));
    return d;
  };

  const fmt = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d) : null;

  const sunrise = calc(true);
  let sunset = calc(false);
  // Both are derived from a UT hour laid onto the same UTC date, and at these
  // longitudes sunset lands after midnight UTC — so it sorts *before* sunrise
  // and the duration comes out negative. Formatting is unaffected either way.
  if (sunrise && sunset && sunset.getTime() <= sunrise.getTime()) {
    sunset = new Date(sunset.getTime() + 86400000);
  }
  let daylight: string | null = null;
  if (sunrise && sunset) {
    const mins = Math.round((sunset.getTime() - sunrise.getTime()) / 60000);
    daylight = `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  return { sunrise: fmt(sunrise), sunset: fmt(sunset), daylight };
}
