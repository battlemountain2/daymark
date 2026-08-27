import { hhmm, leaveAdvice, building, isOnline, type ClassBlock } from "@/lib/schedule";
import { daysBetween, longDate } from "@/lib/localtime";
import type { Term } from "@/lib/term";

/**
 * The one sentence at the top of the page.
 *
 * The header used to concatenate three independent facts — weather, then class
 * count, then assignment count — which reads as a list and makes you do the
 * synthesis yourself: *72°, clear. 3 classes left today. 2 assignments already
 * submitted. Film 01 is due in 3 days.* Every clause is true and none of them
 * is the answer to the question you actually opened the page with, which is
 * **what do I do right now**.
 *
 * So this picks exactly one thing and says it. The ladder below is ordered by
 * how soon acting on it matters, and the first rung that matches wins:
 *
 *   1. you should be walking       — time-critical, overrides everything
 *   2. you're in class             — the answer is "nothing, you're busy"
 *   3. something is due today      — the deadline outranks a later class
 *   4. a class is coming up        — with the leave-by time
 *   5. classes are done            — so the work is what's left
 *   6. no classes at all           — say why, then the work
 *
 * Weather appears only when it changes what you'd carry or wear. A line that
 * says "72° and clear" every day in Albuquerque is a line you stop reading, and
 * then you also stop reading the day it says something.
 *
 * Pure, so the whole ladder can be swept across a synthetic week without
 * rendering anything — see the sweep in the session history.
 */

export type LedeItem = { title: string; due: string; done: boolean };

export type LedeWeather = {
  tempF: number | null;
  sky: string | null;
  precipChance?: number | null;
} | null;

export type Tone = "go" | "class" | "due" | "soon" | "clear";

export type Lede = {
  lead: string;
  sub: string | null;
  tone: Tone;
};

export type LedeInputs = {
  now: { iso: string; dow: number; minutes: number };
  term: Term;
  classes: ClassBlock[];
  /**
   * `null` means Canvas hasn't arrived yet — not that there's nothing due.
   * The distinction matters: the schedule-only lede is *correct and complete*
   * for rungs 1, 2, 4 and 5, so it can render instantly as the Suspense
   * fallback and in the common cached case never visibly changes. Saying
   * "nothing due" while still loading would be a lie that later corrects
   * itself, which is worse than saying less.
   */
  items: LedeItem[] | null;
  weather: LedeWeather;
};

const fmt = (m: number): string => {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
};

/** What to call a class in 40px uppercase: the code if it has one. */
const label = (c: ClassBlock): string => (c.code?.trim() || c.title || "class").trim();

const clip = (s: string, n: number): string =>
  s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Weather worth a clause. Thresholds are Albuquerque-calibrated: 88° is a warm
 * day here and not news, 95° is. Returns a fragment meant to be appended to a
 * sentence, or null far more often than not.
 */
function weatherClause(w: LedeWeather): string | null {
  if (!w) return null;
  const chance = w.precipChance ?? 0;
  const sky = (w.sky ?? "").toLowerCase();
  if (/thunder|storm/.test(sky)) return "thunderstorms";
  if (/snow|sleet|freezing/.test(sky)) return sky;
  if (/rain|shower|drizzle/.test(sky)) return "raining now";
  if (chance >= 50) return `${chance}% chance of rain`;
  if (w.tempF != null && w.tempF >= 95) return `${w.tempF}° — take water`;
  if (w.tempF != null && w.tempF <= 34) return `${w.tempF}° out`;
  return null;
}

/** Undone work, soonest first, split into overdue and ahead. */
function split(items: LedeItem[] | null, iso: string) {
  if (!items) return null;
  const open = items.filter((i) => !i.done).sort((a, b) => (a.due < b.due ? -1 : 1));
  return {
    overdue: open.filter((i) => daysBetween(iso, i.due) < 0),
    today: open.filter((i) => daysBetween(iso, i.due) === 0),
    ahead: open.filter((i) => daysBetween(iso, i.due) > 0),
  };
}

/** The work sentence, used as the sub-line on most rungs. */
function workSub(items: LedeItem[] | null, iso: string): string | null {
  const s = split(items, iso);
  if (!s) return null;

  if (s.overdue.length) {
    return s.overdue.length === 1
      ? `${clip(s.overdue[0].title, 54)} is overdue.`
      : `${plural(s.overdue.length, "thing")} overdue — oldest is ${clip(s.overdue[0].title, 40)}.`;
  }
  if (s.today.length) {
    return s.today.length === 1
      ? `${clip(s.today[0].title, 54)} is due today.`
      : `${plural(s.today.length, "thing")} due today.`;
  }
  const next = s.ahead[0];
  if (!next) return "Nothing due.";
  const d = daysBetween(iso, next.due);
  const week = s.ahead.filter((i) => daysBetween(iso, i.due) <= 7).length;
  const when = d === 1 ? "tomorrow" : `in ${d} days`;
  return week >= 3
    ? `${clip(next.title, 44)} ${when}, and ${week - 1} more this week.`
    : `${clip(next.title, 54)} is due ${when}.`;
}

/** Join non-empty clauses into one sentence without double punctuation. */
const sentence = (...parts: Array<string | null>): string | null => {
  const kept = parts.filter((p): p is string => !!p && !!p.trim());
  return kept.length ? kept.join(" ") : null;
};

export function lede({ now, term, classes, items, weather }: LedeInputs): Lede {
  const wx = weatherClause(weather);
  const work = workSub(items, now.iso);
  const s = split(items, now.iso);

  const inClass = classes.find(
    (c) => hhmm(c.start) <= now.minutes && hhmm(c.end) > now.minutes
  );
  const advice = leaveAdvice(classes, now.minutes);

  /* 1 — walking time. Checked before anything else because it is the only rung
     that expires: a deadline still matters in ten minutes, a class you are
     late for does not. `leaveAdvice` returns the next class whenever there is
     one, so the comparison against `now` is what makes it a nudge rather than
     a permanent banner. */
  if (advice && !isOnline(advice.next.where) && now.minutes >= advice.leaveAtMinutes && !inClass) {
    const mins = hhmm(advice.next.start) - now.minutes;
    return {
      tone: "go",
      lead: `Leave now for ${label(advice.next)}`,
      sub: sentence(
        // The lead uses the course code because it survives 62px uppercase;
        // the full name goes here, where there is room for it.
        advice.next.title && advice.next.title !== label(advice.next)
          ? `${advice.next.title}.` : null,
        `${fmt(hhmm(advice.next.start))} in ${advice.next.where}${
          mins > 0 ? ` — ${plural(mins, "minute")} out` : ", starting now"
        }.`,
        advice.hop ? `${advice.hop.from} to ${advice.hop.to}, so don't dawdle.` : null,
        wx ? `${wx[0].toUpperCase()}${wx.slice(1)}.` : null
      ),
    };
  }

  /* 2 — in class. The honest answer to "what now" is "nothing, you're busy",
     so the sub-line looks past the current class rather than repeating it. */
  if (inClass) {
    const after = classes.find((c) => hhmm(c.start) >= hhmm(inClass.end));
    return {
      tone: "class",
      lead: isOnline(inClass.where)
        ? `${label(inClass)} block until ${fmt(hhmm(inClass.end))}`
        : `In ${label(inClass)} until ${fmt(hhmm(inClass.end))}`,
      sub: sentence(
        after
          ? `Then ${label(after)} at ${fmt(hhmm(after.start))}${
              isOnline(after.where) ? ", online" : ` in ${building(after.where)}`
            }.`
          : "Last class of the day.",
        work
      ),
    };
  }

  /* 3 — due today outranks a class later today. A class is a place to be; a
     deadline is work that has to happen before it. */
  if (s?.today.length) {
    const next = classes.find((c) => hhmm(c.start) > now.minutes);
    return {
      tone: "due",
      lead:
        s.today.length === 1
          // Budgeted so the whole lead stays inside ~46 characters: the suffix
          // costs 12, and this renders at 40px uppercase where an overrun
          // becomes a third line and swamps the page it is meant to organise.
          ? `${clip(s.today[0].title, 34)} — due today`
          : `${plural(s.today.length, "thing")} due today`,
      sub: sentence(
        s.today.length > 1 ? `Soonest: ${clip(s.today[0].title, 54)}.` : null,
        next
          ? `${label(next)} at ${fmt(hhmm(next.start))}${
              isOnline(next.where) ? ", online" : `, ${building(next.where)}`
            }.`
          : null,
        s.overdue.length ? `${plural(s.overdue.length, "other thing")} overdue.` : null,
        wx ? `${wx[0].toUpperCase()}${wx.slice(1)}.` : null
      ),
    };
  }

  /* 4 — a class ahead, with the leave-by time so the number is actionable
     rather than something to subtract in your head. */
  if (advice) {
    const until = advice.leaveAtMinutes - now.minutes;
    const online = isOnline(advice.next.where);
    return {
      tone: "soon",
      lead: `${label(advice.next)} at ${fmt(hhmm(advice.next.start))}`,
      sub: sentence(
        // No leave-by for something you attend from a laptop.
        online
          ? "Online — nowhere to be."
          : `${advice.next.where}. Leave by ${fmt(advice.leaveAtMinutes)}${
              until <= 90 ? ` — ${plural(until, "minute")}` : ""
            }.`,
        work,
        online ? null : wx ? `${wx[0].toUpperCase()}${wx.slice(1)}.` : null
      ),
    };
  }

  /* 5 — classes happened and are over. */
  if (classes.length) {
    return {
      tone: "clear",
      lead: "Done with class",
      sub: sentence(work, wx ? `${wx[0].toUpperCase()}${wx.slice(1)}.` : null),
    };
  }

  /* 6 — no classes at all today, which has four quite different reasons and
     the user should be told which one. */
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.dow];
  const why =
    now.iso < term.start ? `${term.name} starts ${longDate(term.start)}.`
    : now.iso > term.end ? `${term.name} is over. Go outside.`
    : term.breaks.includes(now.iso) ? "Break — no classes today."
    : `No classes on ${dayName}s.`;

  return {
    tone: "clear",
    lead: term.breaks.includes(now.iso) ? "Break day" : "No class today",
    sub: sentence(why, work, wx ? `${wx[0].toUpperCase()}${wx.slice(1)}.` : null),
  };
}
