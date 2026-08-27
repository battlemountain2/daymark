/**
 * Where the sun actually is.
 *
 * NOAA's solar position algorithm, trimmed to what a dashboard needs. All of it
 * is arithmetic on a timestamp and a coordinate — no network, no key, never
 * stale, correct on a plane or in a basement.
 *
 * Accurate to a fraction of a degree, which is far better than a page that
 * renders it 300px wide can show.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Days since the J2000.0 epoch, fractional. */
function julianCentury(d: Date): number {
  const jd = d.getTime() / 86400000 + 2440587.5;
  return (jd - 2451545) / 36525;
}

function geomMeanLongSun(t: number): number {
  return (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360;
}
function geomMeanAnomalySun(t: number): number {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}
function eccentricityEarthOrbit(t: number): number {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}
function sunEqOfCenter(t: number): number {
  const m = geomMeanAnomalySun(t) * RAD;
  return (
    Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289
  );
}
function sunApparentLong(t: number): number {
  const trueLong = geomMeanLongSun(t) + sunEqOfCenter(t);
  const omega = 125.04 - 1934.136 * t;
  return trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
}
function meanObliquityOfEcliptic(t: number): number {
  const s = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  return 23 + (26 + s / 60) / 60;
}
function obliquityCorrection(t: number): number {
  return meanObliquityOfEcliptic(t) + 0.00256 * Math.cos((125.04 - 1934.136 * t) * RAD);
}

/** Sun's declination in degrees — how far north or south of the equator it sits. */
export function solarDeclination(t: number): number {
  const e = obliquityCorrection(t) * RAD;
  const lambda = sunApparentLong(t) * RAD;
  return Math.asin(Math.sin(e) * Math.sin(lambda)) * DEG;
}

/**
 * Equation of time, in minutes. The gap between clock noon and solar noon,
 * caused by Earth's tilt and its elliptical orbit. Swings about ±16 minutes
 * across a year — leave it out and everything is visibly wrong.
 */
export function equationOfTime(t: number): number {
  const epsilon = obliquityCorrection(t) * RAD;
  const l0 = geomMeanLongSun(t) * RAD;
  const e = eccentricityEarthOrbit(t);
  const m = geomMeanAnomalySun(t) * RAD;
  let y = Math.tan(epsilon / 2);
  y *= y;

  const etime =
    y * Math.sin(2 * l0) -
    2 * e * Math.sin(m) +
    4 * e * y * Math.sin(m) * Math.cos(2 * l0) -
    0.5 * y * y * Math.sin(4 * l0) -
    1.25 * e * e * Math.sin(2 * m);

  return etime * 4 * DEG;
}

export type SunPosition = {
  /** Degrees above the horizon. Negative means it's down. */
  elevation: number;
  /** Compass bearing, 0 = due north, 90 = east. */
  azimuth: number;
  /** 16-point compass name for the azimuth. */
  bearing: string;
  /** 0 at sunrise, 1 at sunset — where you are along today's arc. */
  arcProgress: number;
  isUp: boolean;
};

const COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

export function sunPosition(lat: number, lon: number, when = new Date()): SunPosition {
  const t = julianCentury(when);
  const decl = solarDeclination(t);
  const eqTime = equationOfTime(t);

  // Minutes past midnight UTC, converted to a true solar time at this longitude.
  const utcMinutes =
    when.getUTCHours() * 60 + when.getUTCMinutes() + when.getUTCSeconds() / 60;
  let trueSolarTime = (utcMinutes + eqTime + 4 * lon) % 1440;
  if (trueSolarTime < 0) trueSolarTime += 1440;

  // Hour angle: 0 at solar noon, negative in the morning.
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latR = lat * RAD, declR = decl * RAD, haR = hourAngle * RAD;

  const cosZenith =
    Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(haR);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith))) * DEG;
  const elevation = 90 - zenith;

  let azimuth: number;
  const denom = Math.cos(latR) * Math.sin(zenith * RAD);
  if (Math.abs(denom) > 1e-8) {
    let c = (Math.sin(latR) * Math.cos(zenith * RAD) - Math.sin(declR)) / denom;
    c = Math.max(-1, Math.min(1, c));
    azimuth = 180 - Math.acos(c) * DEG;
    if (hourAngle > 0) azimuth = 360 - azimuth;
  } else {
    azimuth = lat > 0 ? 180 : 0;
  }
  azimuth = ((azimuth % 360) + 360) % 360;

  // Half-day arc: how far from solar noon sunrise and sunset sit.
  const cosHa0 =
    (Math.cos(90.833 * RAD) - Math.sin(latR) * Math.sin(declR)) /
    (Math.cos(latR) * Math.cos(declR));
  const ha0 = Math.abs(cosHa0) <= 1 ? Math.acos(cosHa0) * DEG : cosHa0 > 1 ? 0 : 180;
  const arcProgress = ha0 === 0 ? 0 : (hourAngle + ha0) / (2 * ha0);

  return {
    elevation,
    azimuth,
    bearing: COMPASS[Math.round(azimuth / 22.5) % 16],
    arcProgress: Math.max(0, Math.min(1, arcProgress)),
    isUp: elevation > -0.833,
  };
}

/** Minutes of daylight for a date — the number that shrinks all semester. */
export function dayLengthMinutes(lat: number, date: Date): number {
  const t = julianCentury(date);
  const decl = solarDeclination(t) * RAD;
  const latR = lat * RAD;
  const cosHa =
    (Math.cos(90.833 * RAD) - Math.sin(latR) * Math.sin(decl)) / (Math.cos(latR) * Math.cos(decl));
  if (cosHa > 1) return 0;          // polar night
  if (cosHa < -1) return 1440;      // midnight sun
  return (Math.acos(cosHa) * DEG * 8);
}

/** Daylight across a date range, for the term-long curve. */
export function daylightSeries(lat: number, startIso: string, endIso: string, step = 3) {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd, 12);
  const end = Date.UTC(ey, em - 1, ed, 12);
  const out: Array<{ iso: string; minutes: number }> = [];
  for (let ms = start; ms <= end; ms += step * 86400000) {
    const d = new Date(ms);
    out.push({ iso: d.toISOString().slice(0, 10), minutes: dayLengthMinutes(lat, d) });
  }
  return out;
}

/**
 * Actual sunrise, solar noon and sunset as instants.
 *
 * Derived from the equation of time and the half-day hour angle rather than
 * from a position sample. That distinction matters: `sunPosition().arcProgress`
 * is clamped to 0…1, so at night it pins to an end of the arc and any time
 * reconstructed from it is wrong — which is exactly the bug this replaces.
 */
export function sunEvents(lat: number, lon: number, date = new Date()) {
  const t = julianCentury(date);
  const decl = solarDeclination(t) * RAD;
  const eqTime = equationOfTime(t);
  const latR = lat * RAD;

  // Minutes past midnight UTC at which the sun crosses the local meridian.
  const noonMinutesUtc = 720 - 4 * lon - eqTime;

  const cosHa =
    (Math.cos(90.833 * RAD) - Math.sin(latR) * Math.sin(decl)) /
    (Math.cos(latR) * Math.cos(decl));

  // Midnight UTC of this date, as the base for the minute offsets above.
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const at = (mins: number) => new Date(base + mins * 60000);

  const solarNoon = at(noonMinutesUtc);
  if (cosHa > 1) return { sunrise: null, sunset: null, solarNoon, dayMinutes: 0 };
  if (cosHa < -1) return { sunrise: null, sunset: null, solarNoon, dayMinutes: 1440 };

  const ha0 = Math.acos(cosHa) * DEG;          // degrees from noon to the horizon
  const halfDay = ha0 * 4;                      // 4 minutes per degree
  return {
    sunrise: at(noonMinutesUtc - halfDay),
    sunset: at(noonMinutesUtc + halfDay),
    solarNoon,
    dayMinutes: halfDay * 2,
  };
}
