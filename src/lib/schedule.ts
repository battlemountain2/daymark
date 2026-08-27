/**
 * Time and schedule helpers.
 *
 * The schedule itself used to live here as a hard-coded object, which gave the
 * app an expiry date. It now lives in the database as a `Term` (see
 * `src/lib/term.ts`) and is passed in; what remains here is the shape of a
 * class block and the pure arithmetic that operates on one.
 *
 * Canvas is still not the source for any of this: Canvas knows about
 * assignments, not about which building you have to walk to at 11am.
 */
import type { Term } from "@/lib/term";

export type ClassBlock = {
  /** 24h "HH:MM" in America/Denver */
  start: string;
  end: string;
  code: string;
  title: string;
  where: string;
  /** colour key: geo | pol | his | fit | adm */
  ck: "geo" | "pol" | "his" | "fit" | "adm";
};

export const TZ = "America/Denver";

/** Minutes since midnight from "HH:MM". */
export const hhmm = (s: string): number => {
  const [h, m] = s.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

/** "YYYY-MM-DD" and weekday for a Date, in Brayan's timezone rather than the server's. */
export function localParts(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday as string]!;
  return {
    iso: `${o.year}-${o.month}-${o.day}`,
    dow,
    minutes: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10),
  };
}

/** Classes on a given date, honouring term bounds and breaks. */
export function classesOn(term: Term, iso: string, dow: number): ClassBlock[] {
  if (iso < term.start || iso > term.end) return [];
  if (term.breaks.includes(iso)) return [];
  return term.schedule[dow] ?? [];
}

export type Gap = { afterIndex: number; minutes: number; from: string; to: string };

/** Open blocks of >= `min` minutes between consecutive classes. */
export function gaps(list: ClassBlock[], min = 45): Gap[] {
  const out: Gap[] = [];
  for (let i = 1; i < list.length; i++) {
    const g = hhmm(list[i].start) - hhmm(list[i - 1].end);
    if (g >= min) out.push({ afterIndex: i - 1, minutes: g, from: list[i - 1].end, to: list[i].start });
  }
  return out;
}

/** Strip the room number so "Mitchell Hall 101" -> "Mitchell Hall". */
export const building = (where: string): string => where.replace(/\s+\d+[A-Za-z]?$/, "").trim();

/**
 * A block with no building to walk to.
 *
 * Brayan's fitness course is `where: "Online"`, and every piece of advice this
 * app gives about *going* somewhere is nonsense for it — "leave by 9:50am" for
 * a browser tab, a walking-time nudge with no walk. It read fine in testing
 * only because the online course sits on Saturday, where nothing else competes.
 * Anything that talks about leaving or arriving must check this first.
 */
export const isOnline = (where: string): boolean =>
  /\b(online|remote|async|asynchronous|virtual|zoom)\b/i.test(where ?? "");

/**
 * When to head out for the next class. A tight hop between two different
 * buildings earns extra lead time — the 9:00 lab ends at 10:45 in Bandelier
 * and the 11:00 is in Mitchell, which is the one that actually catches him out.
 */
export function leaveAdvice(list: ClassBlock[], nowMinutes: number) {
  const idx = list.findIndex((c) => hhmm(c.start) > nowMinutes);
  if (idx === -1) return null;
  const next = list[idx];
  const prev = idx > 0 ? list[idx - 1] : null;
  let lead = 10;
  let hop: { from: string; to: string; gap: number } | null = null;
  if (prev) {
    const gap = hhmm(next.start) - hhmm(prev.end);
    if (gap <= 20 && building(prev.where) !== building(next.where)) {
      lead = 15;
      hop = { from: building(prev.where), to: building(next.where), gap };
    }
  }
  return { next, leaveAtMinutes: hhmm(next.start) - lead, hop };
}
