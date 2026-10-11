import { localDay } from "./localtime";
import type { WorkoutDay } from "./fitness-data";

export const WORKOUT_SESSIONS_KEY = "daymark:workout:sessions:v1";
export type WeightUnit = "lb" | "kg";
export type LoadKind = "weight" | "bodyweight" | "assisted" | "band";
export type LoggedSet = { weight: string; reps: string; done: boolean };
export type LoggedExercise = {
  id: string;
  name: string;
  target: string;
  cue: string;
  kind: LoadKind;
  metric: "reps" | "minutes";
  restSeconds: number;
  sets: LoggedSet[];
};
export type WorkoutSession = {
  id: string;
  performedOn: string;
  plannedDay: string;
  title: string;
  mode: "gym" | "home";
  unit: WeightUnit;
  durationMinutes?: number;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  exercises: LoggedExercise[];
  note: string;
  autoRest: boolean;
  rest: { deadline: number; duration: number } | null;
};

export function workoutProgress(session: WorkoutSession) {
  const sets = session.exercises.flatMap((ex) => ex.sets);
  return { done: sets.filter((s) => s.done).length, total: sets.length };
}

export function previousExercise(
  sessions: WorkoutSession[],
  id: string,
  before: string,
) {
  return (
    sessions
      .filter((s) => s.finishedAt && s.startedAt < before)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .flatMap((session) =>
        session.exercises
          .filter((ex) => ex.id === id && ex.sets.some((s) => s.done))
          .map((ex) => ({ session, ex })),
      )[0] || null
  );
}

function convertedWeight(value: string, from: WeightUnit, to: WeightUnit) {
  if (!value || from === to) return value;
  return String(
    Math.round(
      Number(value) * (from === "lb" ? 0.45359237 : 1 / 0.45359237) * 10,
    ) / 10,
  );
}

/** Snapshot labels and targets so later routine edits never rewrite past sessions. */
export function newWorkoutSession(
  day: WorkoutDay,
  mode: "gym" | "home",
  unit: WeightUnit,
  sessions: WorkoutSession[],
  id: string,
  now = new Date(),
): WorkoutSession {
  const startedAt = now.toISOString();
  const exercises = (day.isRest || mode === "home" ? day.home : day.gym).map(
    (ex) => {
      const previous = previousExercise(sessions, ex.id, startedAt);
      const kind: LoadKind =
        previous?.ex.kind ||
        (/assisted/i.test(ex.name)
          ? "assisted"
          : /band/i.test(ex.name)
            ? "band"
            : mode === "home"
              ? "bodyweight"
              : "weight");
      const count = Math.min(20, Number(ex.sets.match(/^(\d+)×/)?.[1] || 1));
      return {
        id: ex.id,
        name: ex.name,
        target: ex.sets,
        cue: ex.tip,
        kind,
        metric:
          day.isRest || /min/i.test(ex.sets)
            ? ("minutes" as const)
            : ("reps" as const),
        restSeconds: previous?.ex.restSeconds || 90,
        sets: Array.from({ length: count }, (_, i) => {
          const candidate = previous?.ex.sets[i];
          const prior = candidate?.done ? candidate : undefined;
          return {
            weight: prior
              ? convertedWeight(prior.weight, previous!.session.unit, unit)
              : "",
            reps: prior?.reps || "",
            done: false,
          };
        }),
      };
    },
  );
  return {
    id,
    performedOn: localDay(now),
    plannedDay: day.day,
    title: day.label,
    mode: day.isRest ? "home" : mode,
    unit,
    startedAt,
    finishedAt: null,
    updatedAt: startedAt,
    exercises,
    note: "",
    autoRest: false,
    rest: null,
  };
}

export function changeLoggedSet(
  session: WorkoutSession,
  exerciseId: string,
  index: number,
  change: Partial<LoggedSet>,
  now = new Date(),
): WorkoutSession {
  if (
    change.weight !== undefined &&
    !/^(?:\d{1,4}(?:\.\d{0,2})?)?$/.test(change.weight)
  )
    throw Error("Use a positive weight, or leave it blank.");
  if (change.reps !== undefined && !/^\d{0,3}$/.test(change.reps))
    throw Error("Use a whole number, or leave it blank.");
  const exercise = session.exercises.find((ex) => ex.id === exerciseId);
  if (!exercise?.sets[index]) throw Error("This set could not be found.");
  const set = { ...exercise.sets[index], ...change };
  // Completed entries need a real result; load is optional for bodyweight/bands.
  if (change.done && (!set.reps || Number(set.reps) < 1))
    throw Error(
      `Enter the ${exercise.metric === "minutes" ? "minutes" : "reps"} you completed first.`,
    );
  if (set.done && (!set.reps || Number(set.reps) < 1)) set.done = false;
  return {
    ...session,
    updatedAt: now.toISOString(),
    rest:
      change.done && session.autoRest && !session.finishedAt
        ? {
            deadline: now.getTime() + exercise.restSeconds * 1000,
            duration: exercise.restSeconds,
          }
        : session.rest,
    exercises: session.exercises.map((ex) =>
      ex.id === exerciseId
        ? { ...ex, sets: ex.sets.map((s, i) => (i === index ? set : s)) }
        : ex,
    ),
  };
}

export function finishWorkout(
  session: WorkoutSession,
  now = new Date(),
): WorkoutSession {
  if (!workoutProgress(session).done)
    throw Error("Complete at least one set before finishing this session.");
  return {
    ...session,
    finishedAt: session.finishedAt || now.toISOString(),
    updatedAt: now.toISOString(),
    rest: null,
  };
}

export function workoutMinutes(session: WorkoutSession): number {
  if (
    Number.isInteger(session.durationMinutes) &&
    session.durationMinutes! >= 0 &&
    session.durationMinutes! <= 1440
  )
    return session.durationMinutes!;
  const elapsed =
    (Date.parse(session.finishedAt || session.updatedAt) -
      Date.parse(session.startedAt)) /
    60000;
  return Number.isFinite(elapsed) ? Math.max(0, Math.round(elapsed)) : 0;
}

export function exerciseResult(ex: LoggedExercise, unit: WeightUnit) {
  const completed = ex.sets.filter((s) => s.done);
  if (!completed.length) return "No completed sets";
  return completed
    .map(
      (s) =>
        `${s.weight && ["weight", "assisted"].includes(ex.kind) ? `${s.weight} ${unit}${ex.kind === "assisted" ? " assistance" : ""} × ` : ""}${s.reps}${ex.metric === "minutes" ? " min" : " reps"}`,
    )
    .join(" · ");
}
