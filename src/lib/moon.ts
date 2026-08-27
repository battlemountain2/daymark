/**
 * Moon phase, from arithmetic alone.
 *
 * Counts synodic months forward from a known new moon (2000 Jan 6, 18:14 UTC).
 * Good to a few hours, which is far finer than "draw the right crescent" needs.
 * Like the solar code, it works offline and never goes stale.
 */

const SYNODIC = 29.530588853;          // mean length of a lunation, days
const KNOWN_NEW_MOON_JD = 2451550.1;   // 2000-01-06 18:14 UTC

export type Moon = {
  /** Days since the last new moon, 0 … 29.53 */
  age: number;
  /** 0 = new, 1 = full */
  illumination: number;
  /** 0 … 1 around the whole cycle — what a renderer wants */
  phase: number;
  waxing: boolean;
  name: string;
};

export function moonPhase(when = new Date()): Moon {
  const jd = when.getTime() / 86400000 + 2440587.5;
  let age = (jd - KNOWN_NEW_MOON_JD) % SYNODIC;
  if (age < 0) age += SYNODIC;

  const phase = age / SYNODIC;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const waxing = phase < 0.5;

  // Named bands. The quarters get a narrow window so "first quarter" means it.
  let name: string;
  if (age < 1.0) name = "New moon";
  else if (age < 6.4) name = "Waxing crescent";
  else if (age < 8.4) name = "First quarter";
  else if (age < 13.8) name = "Waxing gibbous";
  else if (age < 15.8) name = "Full moon";
  else if (age < 21.1) name = "Waning gibbous";
  else if (age < 23.1) name = "Last quarter";
  else if (age < 28.5) name = "Waning crescent";
  else name = "New moon";

  return { age, illumination, phase, waxing, name };
}

/**
 * Where the moon is in the sky.
 *
 * Low-precision lunar ephemeris — mean elements plus the two largest periodic
 * terms (evection in longitude, the principal latitude term). Good to roughly a
 * third of a degree, which is well inside "is it up, and roughly where".
 * A full Meeus solution would carry sixty terms to buy accuracy nothing here
 * can display.
 */

const RAD = Math.PI / 180;

/** Days since J2000.0. */
const daysSinceJ2000 = (d: Date): number => d.getTime() / 86400000 + 2440587.5 - 2451545;

export type MoonPosition = {
  /** Degrees above the horizon; negative means it's down. */
  altitude: number;
  /** Compass bearing, 0 = north. */
  azimuth: number;
  bearing: string;
  distanceKm: number;
  isUp: boolean;
};

const COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

export function moonPosition(lat: number, lon: number, when = new Date()): MoonPosition {
  const d = daysSinceJ2000(when);

  // Mean elements
  const L = (218.316 + 13.176396 * d) * RAD;   // mean longitude
  const M = (134.963 + 13.064993 * d) * RAD;   // mean anomaly
  const F = (93.272 + 13.229350 * d) * RAD;    // argument of latitude

  const lambda = L + 6.289 * RAD * Math.sin(M);          // ecliptic longitude
  const beta = 5.128 * RAD * Math.sin(F);                // ecliptic latitude
  const distanceKm = 385001 - 20905 * Math.cos(M);

  // Ecliptic → equatorial
  const e = 23.4397 * RAD;
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(e) - Math.tan(beta) * Math.sin(e),
    Math.cos(lambda)
  );
  const dec = Math.asin(
    Math.sin(beta) * Math.cos(e) + Math.cos(beta) * Math.sin(e) * Math.sin(lambda)
  );

  // Equatorial → horizontal, via local sidereal time
  const lst = (280.16 + 360.9856235 * d) * RAD + lon * RAD;
  const H = lst - ra;
  const latR = lat * RAD;

  const altitude = Math.asin(
    Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(H)
  ) / RAD;

  let azimuth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(latR) - Math.tan(dec) * Math.cos(latR)
  ) / RAD + 180;                                   // atan2 form gives south-zero
  azimuth = ((azimuth % 360) + 360) % 360;

  return {
    altitude,
    azimuth,
    bearing: COMPASS[Math.round(azimuth / 22.5) % 16],
    distanceKm: Math.round(distanceKm),
    isUp: altitude > 0,
  };
}

/**
 * Moonrise and moonset for a local day.
 *
 * Sampled rather than solved: step through the day looking for the altitude
 * crossing zero, then bisect. The moon rises about fifty minutes later each
 * day, so a given calendar day genuinely may have no rise or no set — both
 * fields are independently nullable and the UI has to handle it.
 */
export function moonTimes(lat: number, lon: number, dayStartUtcMs: number) {
  const alt = (ms: number) => moonPosition(lat, lon, new Date(ms)).altitude;
  const STEP = 10 * 60000;
  let rise: Date | null = null, set: Date | null = null;

  for (let t = dayStartUtcMs; t < dayStartUtcMs + 86400000; t += STEP) {
    const a = alt(t), b = alt(t + STEP);
    if (a === b || (a > 0) === (b > 0)) continue;
    // Bisect the crossing down to about a minute.
    let lo = t, hi = t + STEP;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      if ((alt(lo) > 0) === (alt(mid) > 0)) lo = mid; else hi = mid;
    }
    const at = new Date((lo + hi) / 2);
    if (b > a && !rise) rise = at;
    if (b < a && !set) set = at;
  }
  return { rise, set };
}

/** Days until the next full moon and the next new moon. */
export function nextPhases(when = new Date()) {
  const { age } = moonPhase(when);
  const toFull = (SYNODIC / 2 - age + SYNODIC) % SYNODIC;
  const toNew = (SYNODIC - age) % SYNODIC;
  return { toFull, toNew };
}
