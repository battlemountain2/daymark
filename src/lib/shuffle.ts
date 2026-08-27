/**
 * A deterministic shuffle.
 *
 * Stepping through a sorted list one index per day is not a shuffle — it walks
 * the alphabet, which is exactly the bug the first version of this dashboard
 * had. Stepping by a number coprime with the list length visits every item
 * exactly once per cycle while landing far apart on consecutive days.
 *
 * Near the golden ratio gives the best spread. For 76 albums the step is 47.
 */
export function stride(n: number): number {
  if (n < 3) return 1;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const k = Math.max(1, Math.round(n * 0.6180339887));
  for (let d = 0; d < n; d++) {
    for (const cand of [k - d, k + d]) {
      if (cand >= 1 && cand < n && gcd(cand, n) === 1) return cand;
    }
  }
  return 1;
}

/** Index for a given day-of-year. Same day always yields the same pick. */
export const pickForDay = (poolSize: number, dayOfYear: number): number =>
  poolSize ? (dayOfYear * stride(poolSize)) % poolSize : 0;

export function dayOfYear(d = new Date(), tz = "America/Denver"): number {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
  const [y, m, day] = iso.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, day) - Date.UTC(y, 0, 0)) / 86400000);
}
