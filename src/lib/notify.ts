import { classesOn, hhmm, localParts, leaveAdvice, building, isOnline, type ClassBlock } from "@/lib/schedule";
import { daysBetween } from "@/lib/localtime";
import type { Forecast } from "@/lib/weather";
import type { Assignment } from "@/lib/canvas";
import type { State } from "@/lib/db";
import type { Term } from "@/lib/term";

/**
 * What is worth interrupting someone for.
 *
 * The design constraint is Brayan's, and it's the right one: three scheduled
 * moments, and everything else stays silent unless something genuinely changed.
 * A leave-for-class alert before every class is the kind of thing you stop
 * reading in week two, and once you're ignoring one notification you're
 * ignoring all of them.
 *
 * So: a morning brief, one nudge before the *first* class of the day, a nightly
 * look at tomorrow — plus two exception channels that fire only when Canvas
 * moves or the weather does something unusual. In a normal week those two never
 * fire at all.
 *
 * Every decision here is a pure function of (time, schedule, weather, work), so
 * it can be tested without sending anything.
 */

export type Note = {
  kind: "morning" | "before-class" | "nightly" | "canvas-change" | "weather";
  title: string;
  body: string;
  /** Extra state to remember, for the change-detection kinds. */
  detail?: string;
};

const fmt = (m: number): string => {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
};

const list = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "")
  : xs.length === 2 ? `${xs[0]} and ${xs[1]}`
  : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** Assignments still ahead, soonest first. */
function upcoming(assignments: Assignment[], st: State, iso: string) {
  return assignments
    .filter((a) => !st.ticks[a.id] && daysBetween(iso, a.due) >= 0)
    .sort((a, b) => (a.due < b.due ? -1 : 1));
}

function weatherLine(w: Forecast | null): string {
  const today = w?.days?.find((d) => d.isDaytime) ?? w?.days?.[0];
  if (!today) return "";
  const hot = today.tempF >= 92 ? " — take water" : "";
  const rain = (today.precipChance ?? 0) >= 40 ? " — rain likely" : "";
  return `${today.tempF}°, ${String(today.shortForecast).toLowerCase()}${hot || rain}.`;
}

export type Inputs = {
  now: Date;
  term: Term;
  weather: Forecast | null;
  assignments: Assignment[];
  state: State;
};

/**
 * Everything that is due to be sent at this instant.
 *
 * Windows are hours wide, not minutes. The poller is external and best-effort —
 * GitHub Actions routinely runs a scheduled job late — so a fifteen-minute
 * window polled every fifteen minutes misses entirely on any drift, and the
 * notification silently never arrives. Since the once-per-day claim in the
 * database is what actually prevents repeats, the window only needs to be wide
 * enough to be hit at all: the first poll inside it wins and the rest lose.
 *
 * The cost of a wide window is lateness, not duplication. A morning brief that
 * arrives at 07:45 because the runner was busy is still a morning brief.
 */
export function due({ now, term, weather, assignments, state }: Inputs): Note[] {
  const p = localParts(now);
  const today: ClassBlock[] = classesOn(term, p.iso, p.dow);
  const work = upcoming(assignments, state, p.iso);
  const out: Note[] = [];

  const first = today[0] ?? null;
  const nextDue = work[0] ?? null;
  const dueToday = work.filter((a) => daysBetween(p.iso, a.due) === 0);
  const dueWeek = work.filter((a) => daysBetween(p.iso, a.due) <= 7);

  /* --- morning brief, around 7am ------------------------------------------ */
  if (p.minutes >= 420 && p.minutes < 540) {          // 7am–9am
    const bits: string[] = [];
    const wl = weatherLine(weather);
    if (wl) bits.push(wl);

    if (first) {
      const advice = leaveAdvice(today, 0);
      const tight = advice?.hop ? ` Tight hop after — ${advice.hop.from} to ${advice.hop.to}.` : "";
      bits.push(`First up ${first.title} at ${fmt(hhmm(first.start))}, ${first.where}.${tight}`);
      if (today.length > 1) bits.push(`${today.length} classes today.`);
    } else {
      bits.push("No classes today.");
    }

    if (dueToday.length) bits.push(`Due today: ${list(dueToday.map((a) => a.title))}.`);
    else if (nextDue) {
      const d = daysBetween(p.iso, nextDue.due);
      bits.push(`Next up: ${nextDue.title} in ${d} day${d === 1 ? "" : "s"}.`);
    }

    out.push({ kind: "morning", title: "Today", body: bits.join(" ") });
  }

  /* --- one hour before the first class ------------------------------------ */
  if (first) {
    const start = hhmm(first.start);
    const lead = start - p.minutes;
    // 30–75 minutes ahead, so any poll in that band catches it once.
    if (lead <= 75 && lead > 30) {
      const advice = leaveAdvice(today, p.minutes);
      // "Leave by 9:50" for a browser tab is nonsense, and the online fitness
      // block would have said exactly that every Saturday.
      const online = isOnline(first.where);
      const leaveAt = advice && !online ? fmt(advice.leaveAtMinutes) : null;
      out.push({
        kind: "before-class",
        title: `${first.title} in an hour`,
        body: online
          ? `${fmt(start)}, online.`
          : `${fmt(start)} in ${first.where}.${leaveAt ? ` Leave by ${leaveAt}.` : ""}`,
      });
    }
  }

  /* --- nightly, around 9pm ------------------------------------------------ */
  if (p.minutes >= 1260 && p.minutes < 1380) {        // 9pm–11pm
    // Tomorrow's classes, by looking one day ahead in the same schedule.
    const t = new Date(now.getTime() + 86400000);
    const tp = localParts(t);
    const tomorrow = classesOn(term, tp.iso, tp.dow);
    const bits: string[] = [];

    if (tomorrow.length) {
      const f = tomorrow[0];
      const adv = leaveAdvice(tomorrow, 0);
      bits.push(
        `${f.title} at ${fmt(hhmm(f.start))} in ${building(f.where)}` +
        (adv ? `, leave by ${fmt(adv.leaveAtMinutes)}` : "") + "."
      );
      if (tomorrow.length > 1) bits.push(`${tomorrow.length} classes.`);
    } else {
      bits.push("No classes tomorrow.");
    }

    const dueTomorrow = work.filter((a) => daysBetween(p.iso, a.due) === 1);
    if (dueTomorrow.length) bits.push(`Due tomorrow: ${list(dueTomorrow.map((a) => a.title))}.`);
    // The weekly picture belongs here rather than as its own alert.
    else if (dueWeek.length >= 3) bits.push(`${dueWeek.length} things due this week.`);
    else if (nextDue) {
      const d = daysBetween(p.iso, nextDue.due);
      bits.push(`${nextDue.title} in ${d} day${d === 1 ? "" : "s"}.`);
    }

    out.push({ kind: "nightly", title: "Tomorrow", body: bits.join(" ") });
  }

  return out;
}

/**
 * A stable fingerprint of the assignment list.
 *
 * Compared against the last one to notice a new assignment or a moved due date.
 * Deliberately excludes titles' punctuation and anything Canvas rewrites
 * cosmetically, so it doesn't cry wolf.
 */
export function assignmentFingerprint(assignments: Assignment[]): string {
  return assignments
    .map((a) => `${a.due}|${a.id}`)
    .sort()
    .join(",");
}

/** What changed between two fingerprints, described for a human. */
export function describeChange(
  before: string | null,
  assignments: Assignment[],
  iso: string
): Note | null {
  const now = assignmentFingerprint(assignments);
  if (!before) return null;            // first run: set a baseline, say nothing
  if (before === now) return null;

  const was = new Set(before.split(",").filter(Boolean));
  const is = new Map(assignments.map((a) => [`${a.due}|${a.id}`, a]));

  const added = [...is.keys()].filter((k) => !was.has(k)).map((k) => is.get(k)!);
  // Only mention things still ahead — a due date that moved into the past is
  // not news worth a buzz.
  const ahead = added.filter((a) => daysBetween(iso, a.due) >= 0);
  if (!ahead.length) return null;

  const soonest = ahead.sort((a, b) => (a.due < b.due ? -1 : 1))[0];
  const d = daysBetween(iso, soonest.due);
  return {
    kind: "canvas-change",
    title: ahead.length === 1 ? "New in Canvas" : `${ahead.length} new in Canvas`,
    body: `${soonest.title} — due ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}.`,
    detail: now,
  };
}

/**
 * Weather only when it is genuinely unusual.
 *
 * Albuquerque is sunny and hot for most of this term; a daily forecast push
 * would be noise. These thresholds should fire a handful of times a semester —
 * the first freeze, a real storm, the day autumn arrives.
 */
export function weatherException(w: Forecast | null, iso: string): Note | null {
  const days = (w?.days ?? []).filter((d) => d.isDaytime);
  const today = days[0];
  const tomorrow = days[1];
  const tonight = (w?.days ?? []).find((d) => !d.isDaytime);
  if (!today) return null;

  const reasons: string[] = [];

  if (tonight && tonight.tempF <= 32) reasons.push(`first freeze tonight, ${tonight.tempF}°`);
  if ((today.precipChance ?? 0) >= 60) reasons.push(`${today.precipChance}% chance of rain`);
  if (/thunder|storm|snow|wind advisory|blowing dust/i.test(today.shortForecast)) {
    reasons.push(today.shortForecast.toLowerCase());
  }
  if (tomorrow && Math.abs(tomorrow.tempF - today.tempF) >= 25) {
    reasons.push(`${tomorrow.tempF - today.tempF > 0 ? "up" : "down"} ${Math.abs(tomorrow.tempF - today.tempF)}° tomorrow`);
  }

  if (!reasons.length) return null;
  return {
    kind: "weather",
    title: "Worth knowing",
    body: `${reasons[0][0].toUpperCase()}${reasons.slice(0, 2).join(", ").slice(1)}.`,
    detail: `${iso}:${reasons[0]}`,
  };
}
