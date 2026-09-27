/**
 * What's actually up tonight.
 *
 * Planet positions from the standard low-precision Keplerian elements (the
 * "Approximate Positions of the Planets" method): each planet's orbit is
 * propagated linearly from J2000, solved through Kepler's equation, converted
 * heliocentric → geocentric → equatorial → horizontal.
 *
 * Good to a fraction of a degree across this century, which is far finer than
 * "Jupiter is 40° up in the southeast" requires. Like the sun and moon code it
 * needs no network and cannot go stale.
 *
 * The bright stars are a fixed catalogue — they don't move on any timescale
 * this dashboard cares about — precessed only by the same rotation maths.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/** Centuries since J2000.0. */
const centuries = (d: Date): number =>
  (d.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;

type Elements = {
  name: string;
  /** a(AU), e, i(deg), L(deg), lonPeri(deg), lonNode(deg) and their rates. */
  a: number[]; e: number[]; i: number[]; L: number[]; w: number[]; o: number[];
  /**
   * Standard magnitude coefficients: [H, c1, c2, c3] in
   * V = H + 5·log10(r·Δ) + c1·α + c2·α² + c3·α³, with α the phase angle.
   *
   * The phase term is not optional. Dropping it and using distance alone put
   * Venus at magnitude −5.4 near closest approach; it never gets brighter than
   * about −4.9, because when it's closest it's also a thin crescent.
   */
  mag: [number, number, number, number];
};

/** Values and rates per Julian century, valid 1800–2050. */
const PLANETS: Elements[] = [
  { name: "Mercury", a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906],
    i: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175],
    w: [77.45779628, 0.16047689], o: [48.33076593, -0.12534081], mag: [-0.42, 0.0380, -0.000273, 0.000002] },
  { name: "Venus", a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107],
    i: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729],
    w: [131.60246718, 0.00268329], o: [76.67984255, -0.27769418], mag: [-4.40, 0.0009, 0.000239, -0.00000065] },
  { name: "Mars", a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882],
    i: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499],
    w: [-23.94362959, 0.44441088], o: [49.55953891, -0.29257343], mag: [-1.52, 0.016, 0, 0] },
  { name: "Jupiter", a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253],
    i: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775],
    w: [14.72847983, 0.21252668], o: [100.47390909, 0.20469106], mag: [-9.40, 0.005, 0, 0] },
  { name: "Saturn", a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991],
    i: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201],
    w: [92.59887831, -0.41897216], o: [113.66242448, -0.28867794], mag: [-8.88, 0, 0, 0] },
  // Below naked-eye brightness, so they never appear in "tonight's sky" — they
  // are here for the orrery, which would look absurd stopping at Saturn.
  { name: "Uranus", a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397],
    i: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785],
    w: [170.95427630, 0.40805281], o: [74.01692503, 0.04240589], mag: [-7.19, 0, 0, 0] },
  { name: "Neptune", a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105],
    i: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325],
    w: [44.96476227, -0.32241464], o: [131.78422574, -0.00508664], mag: [-6.87, 0, 0, 0] },
];

/** Naked-eye planets only — Uranus and Neptune are not visible unaided. */
const NAKED_EYE = new Set(["Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);

const EARTH: Elements = {
  name: "Earth", a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392],
  i: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981],
  w: [102.93768193, 0.32327364], o: [0, 0], mag: [0, 0, 0, 0],
};

/** Heliocentric ecliptic rectangular coordinates, in AU. */
function helio(el: Elements, t: number): [number, number, number] {
  const a = el.a[0] + el.a[1] * t;
  const e = el.e[0] + el.e[1] * t;
  const I = (el.i[0] + el.i[1] * t) * RAD;
  const L = norm360(el.L[0] + el.L[1] * t);
  const wBar = el.w[0] + el.w[1] * t;
  const O = (el.o[0] + el.o[1] * t) * RAD;

  const w = (wBar - (el.o[0] + el.o[1] * t)) * RAD;   // argument of perihelion
  let M = norm360(L - wBar);
  if (M > 180) M -= 360;
  M *= RAD;

  // Kepler's equation, Newton–Raphson. Converges in a handful of steps at
  // these eccentricities; the cap is only a guard against a pathological input.
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 12; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }

  // Position in the orbital plane, then rotated into the ecliptic.
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);
  const u = v + w;

  return [
    r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(I)),
    r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(I)),
    r * (Math.sin(u) * Math.sin(I)),
  ];
}

export type SkyObject = {
  name: string;
  kind: "planet" | "star";
  altitude: number;
  azimuth: number;
  bearing: string;
  magnitude: number;
  /** AU from Earth. Null for stars, which are effectively infinitely far. */
  distanceAu: number | null;
};

const COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

/** Equatorial → horizontal for a given place and moment. */
function toHorizon(raHours: number, decDeg: number, lat: number, lon: number, when: Date) {
  const d = when.getTime() / 86400000 + 2440587.5 - 2451545;
  const gmst = 280.16 + 360.9856235 * d;
  const ha = (gmst + lon - raHours * 15) * RAD;
  const dec = decDeg * RAD;
  const latR = lat * RAD;

  const alt = Math.asin(
    Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(ha)
  ) * DEG;
  const az = Math.atan2(
    Math.sin(ha),
    Math.cos(ha) * Math.sin(latR) - Math.tan(dec) * Math.cos(latR)
  ) * DEG + 180;
  return { altitude: alt, azimuth: norm360(az) };
}

/** Ecliptic rectangular → right ascension (hours) and declination (degrees). */
function toEquatorial(x: number, y: number, z: number) {
  const eps = 23.43928 * RAD;
  const xe = x;
  const ye = y * Math.cos(eps) - z * Math.sin(eps);
  const ze = y * Math.sin(eps) + z * Math.cos(eps);
  return {
    ra: norm360(Math.atan2(ye, xe) * DEG) / 15,
    dec: Math.atan2(ze, Math.hypot(xe, ye)) * DEG,
    dist: Math.hypot(xe, ye, ze),
  };
}

export function planetPositions(lat: number, lon: number, when = new Date()): SkyObject[] {
  const t = centuries(when);
  const [ex, ey, ez] = helio(EARTH, t);

  const sunDist = Math.hypot(ex, ey, ez);          // Earth–Sun, in AU

  return PLANETS.map((p) => {
    const [hx, hy, hz] = helio(p, t);
    // Geocentric is simply the heliocentric vector minus Earth's.
    const { ra, dec, dist } = toEquatorial(hx - ex, hy - ey, hz - ez);
    const h = toHorizon(ra, dec, lat, lon, when);

    const r = Math.hypot(hx, hy, hz);               // planet–Sun
    // Phase angle from the Sun–planet–Earth triangle.
    const cosA = (r * r + dist * dist - sunDist * sunDist) / (2 * r * dist);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosA))) * DEG;
    const [H, c1, c2, c3] = p.mag;
    const magnitude =
      H + 5 * Math.log10(Math.max(1e-4, r * dist)) +
      c1 * alpha + c2 * alpha * alpha + c3 * alpha * alpha * alpha;

    return {
      name: p.name,
      kind: "planet" as const,
      altitude: h.altitude,
      azimuth: h.azimuth,
      bearing: COMPASS[Math.round(h.azimuth / 22.5) % 16],
      magnitude,
      distanceAu: dist,
    };
  });
}

/** The brightest stars, J2000 right ascension (hours) and declination. */
const STARS: Array<[string, number, number, number]> = [
  ["Sirius", 6.7525, -16.716, -1.46],
  ["Canopus", 6.3992, -52.696, -0.74],
  ["Arcturus", 14.2610, 19.182, -0.05],
  ["Vega", 18.6156, 38.784, 0.03],
  ["Capella", 5.2782, 45.998, 0.08],
  ["Rigel", 5.2423, -8.202, 0.13],
  ["Procyon", 7.6551, 5.225, 0.34],
  ["Betelgeuse", 5.9195, 7.407, 0.50],
  ["Altair", 19.8464, 8.868, 0.77],
  ["Aldebaran", 4.5987, 16.509, 0.85],
  ["Antares", 16.4901, -26.432, 1.09],
  ["Spica", 13.4199, -11.161, 1.04],
  ["Pollux", 7.7553, 28.026, 1.14],
  ["Deneb", 20.6905, 45.280, 1.25],
  ["Regulus", 10.1395, 11.967, 1.35],
  ["Polaris", 2.5303, 89.264, 1.98],
];

export function starPositions(lat: number, lon: number, when = new Date()): SkyObject[] {
  return STARS.map(([name, ra, dec, mag]) => {
    const h = toHorizon(ra, dec, lat, lon, when);
    return {
      name, kind: "star" as const,
      altitude: h.altitude, azimuth: h.azimuth,
      bearing: COMPASS[Math.round(h.azimuth / 22.5) % 16],
      magnitude: mag, distanceAu: null,
    };
  });
}

/** Everything above the horizon right now, brightest first. */
export function visibleTonight(lat: number, lon: number, when = new Date()): SkyObject[] {
  return [
    ...planetPositions(lat, lon, when).filter((p) => NAKED_EYE.has(p.name)),
    ...starPositions(lat, lon, when),
  ]
    .filter((o) => o.altitude > 5)
    .sort((a, b) => a.magnitude - b.magnitude);
}


/* ------------------------------------------------------------------ orrery */

export type Body = {
  name: string;
  /** Heliocentric ecliptic coordinates in AU, viewed from above the plane. */
  x: number;
  y: number;
  /** Semi-major axis, for drawing the orbit ring. */
  au: number;
  /** Distance from the Sun right now — differs from `au` on eccentric orbits. */
  r: number;
  /** Orbital period in Earth years, from Kepler's third law. */
  years: number;
};

/**
 * The whole system from above, at a given moment.
 *
 * Same `helio()` the visibility maths uses, so a planet drawn on the far side
 * of the Sun here is genuinely on the far side of the Sun — the orrery and
 * "tonight's sky" can never disagree.
 */
export function solarSystem(when = new Date()): Body[] {
  const t = centuries(when);
  const all = [EARTH, ...PLANETS];
  return all.map((el) => {
    const [x, y] = helio(el, t);
    const au = el.a[0] + el.a[1] * t;
    return {
      name: el.name,
      x, y,
      au,
      r: Math.hypot(x, y),
      years: Math.sqrt(au ** 3),          // Kepler's third law
    };
  }).sort((a, b) => a.au - b.au);
}
