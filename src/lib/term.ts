import type { ClassBlock } from "@/lib/schedule";

/**
 * A term, as data rather than source code.
 *
 * The schedule used to be a hard-coded object in `schedule.ts`, which meant the
 * app had an expiry date: on December 12 2026 it became a museum, and Spring
 * 2027 required someone to edit TypeScript. Moving it into the database is the
 * difference between a semester project and something that stays useful.
 *
 * The hard-coded Fall 2026 schedule survives as `DEFAULT_TERM` and is still the
 * fallback when the database is empty or unreachable — a dead database should
 * degrade to a correct-for-now schedule, not to a blank page.
 */

export type Term = {
  name: string;
  /** YYYY-MM-DD */
  start: string;
  end: string;
  /** Dates with no classes: breaks, holidays. */
  breaks: string[];
  /** Keyed by day of week, 0 = Sunday. */
  schedule: Record<number, ClassBlock[]>;
};

export const COLOUR_KEYS = ["geo", "pol", "his", "fit", "adm"] as const;
export type ColourKey = (typeof COLOUR_KEYS)[number];

/** Brayan's Fall 2026, kept as the seed and the fallback. */
export const DEFAULT_TERM: Term = {
  name: "Fall 2026",
  start: "2026-08-17",
  end: "2026-12-12",
  breaks: ["2026-10-08", "2026-10-09"],
  schedule: {
    0: [],
    1: [
      { start: "09:00", end: "10:45", code: "GEOG 1160L", title: "Home Planet Laboratory", where: "Bandelier Hall East 106", ck: "geo" },
      { start: "14:00", end: "14:50", code: "GEOG 1150", title: "Intro to Environmental Studies", where: "Mitchell Hall 120", ck: "geo" },
    ],
    2: [
      { start: "11:00", end: "12:15", code: "HIST 300", title: "Water in History", where: "Ortega Hall 115", ck: "his" },
      { start: "15:30", end: "16:45", code: "GEOG 1160", title: "Home Planet: Land, Water, Life", where: "Bandelier Hall East 105", ck: "geo" },
    ],
    3: [
      { start: "09:00", end: "10:45", code: "GEOG 1115L", title: "Maps and GIScience Laboratory", where: "Bandelier Hall East 106", ck: "geo" },
      { start: "14:00", end: "14:50", code: "GEOG 1150", title: "Intro to Environmental Studies", where: "Mitchell Hall 120", ck: "geo" },
    ],
    4: [
      { start: "11:00", end: "12:15", code: "HIST 300", title: "Water in History", where: "Ortega Hall 115", ck: "his" },
      { start: "15:30", end: "16:45", code: "GEOG 1160", title: "Home Planet: Land, Water, Life", where: "Bandelier Hall East 105", ck: "geo" },
    ],
    5: [
      { start: "14:00", end: "14:50", code: "GEOG 1150", title: "Intro to Environmental Studies", where: "Mitchell Hall 120", ck: "geo" },
    ],
    6: [
      { start: "10:00", end: "11:30", code: "PHED 2996", title: "Intro to Fitness — online coursework", where: "Online", ck: "fit" },
    ],
  },
};

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const str = (v: unknown, max: number): string => String(v ?? "").trim().slice(0, max);

/**
 * Parses untrusted input into a Term, discarding anything malformed.
 *
 * Deliberately lenient about individual rows and strict about the whole: one
 * bad class row is dropped, but a term with no valid dates is rejected
 * outright, because a term with a broken date range breaks every countdown,
 * the daylight curve and the notification windows at once.
 */
export function parseTerm(input: unknown): Term | null {
  if (!input || typeof input !== "object") return null;
  const t = input as Record<string, unknown>;

  if (!isDate(t.start) || !isDate(t.end)) return null;
  if (t.end <= t.start) return null;

  const schedule: Record<number, ClassBlock[]> = {};
  const raw = (t.schedule ?? {}) as Record<string, unknown>;
  for (let d = 0; d < 7; d++) {
    const rows = Array.isArray(raw[String(d)]) ? (raw[String(d)] as unknown[]) : [];
    schedule[d] = rows
      .map((r) => {
        const c = r as Record<string, unknown>;
        if (!isTime(c.start) || !isTime(c.end)) return null;
        if (String(c.end) <= String(c.start)) return null;
        const ck = COLOUR_KEYS.includes(c.ck as ColourKey) ? (c.ck as ColourKey) : "adm";
        const title = str(c.title, 80);
        if (!title) return null;
        return {
          start: c.start, end: c.end,
          code: str(c.code, 20) || "—",
          title,
          where: str(c.where, 60) || "—",
          ck,
        } as ClassBlock;
      })
      .filter((x): x is ClassBlock => x !== null)
      // Sorted here so nothing downstream has to care about input order —
      // gaps() and leaveAdvice() both assume chronological.
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  }

  const breaks = Array.isArray(t.breaks)
    ? [...new Set(t.breaks.filter(isDate))].sort()
    : [];

  return {
    name: str(t.name, 40) || "Term",
    start: t.start,
    end: t.end,
    breaks,
    schedule,
  };
}

/** Total and elapsed days, for the semester bar. */
export const termDays = (term: Term) => {
  const d = (iso: string) => {
    const [y, m, day] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((d(term.end) - d(term.start)) / 86400000);
};
