import { localDay } from "./localtime";
import {
  workoutMinutes,
  type WorkoutSession,
  type WeightUnit,
  type LoadKind,
} from "./workout-sessions";
export type ProgressTrack = {
  key: string;
  id: string;
  name: string;
  kind: LoadKind;
  metric: "reps" | "minutes";
};
export type ProgressPoint = {
  sessionId: string;
  date: string;
  value: number;
  reps: number;
  sets: number;
};
export function progressTracks(sessions: WorkoutSession[]): ProgressTrack[] {
  const tracks = new Map<string, ProgressTrack>();
  for (const session of [...sessions].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  )) {
    if (!session.finishedAt) continue;
    for (const ex of session.exercises) {
      if (!ex.sets.some((set) => set.done && Number(set.reps) > 0)) continue;
      const key = JSON.stringify([ex.id, ex.kind, ex.metric]);
      if (!tracks.has(key))
        tracks.set(key, {
          key,
          id: ex.id,
          name: ex.name,
          kind: ex.kind,
          metric: ex.metric,
        });
    }
  }
  return [...tracks.values()];
}
export function progressPoints(
  sessions: WorkoutSession[],
  track: ProgressTrack,
  unit: WeightUnit,
): ProgressPoint[] {
  return sessions
    .filter((s) => s.finishedAt)
    .sort(
      (a, b) =>
        a.performedOn.localeCompare(b.performedOn) ||
        a.startedAt.localeCompare(b.startedAt),
    )
    .flatMap((session) => {
      const ex = session.exercises.find(
        (ex) =>
          ex.id === track.id &&
          ex.kind === track.kind &&
          ex.metric === track.metric,
      );
      if (!ex) return [];
      const sets = ex.sets
        .filter(
          (set) =>
            set.done &&
            Number(set.reps) > 0 &&
            Number.isFinite(Number(set.reps)),
        )
        .flatMap((set) => {
          if (["weight", "assisted"].includes(ex.kind)) {
            if (
              set.weight === "" ||
              !Number.isFinite(Number(set.weight)) ||
              Number(set.weight) < 0
            )
              return [];
            const load =
              Number(set.weight) *
              (session.unit === unit
                ? 1
                : session.unit === "lb"
                  ? 0.45359237
                  : 1 / 0.45359237);
            return [
              { value: Math.round(load * 10) / 10, reps: Number(set.reps) },
            ];
          }
          return [{ value: Number(set.reps), reps: Number(set.reps) }];
        });
      if (!sets.length) return [];
      const best = sets.reduce((best, set) =>
        (track.kind === "assisted"
          ? set.value < best.value
          : set.value > best.value) ||
        (set.value === best.value && set.reps > best.reps)
          ? set
          : best,
      );
      return [
        {
          sessionId: session.id,
          date: session.performedOn,
          value: best.value,
          reps: best.reps,
          sets: ex.sets.filter((set) => set.done && Number(set.reps) > 0)
            .length,
        },
      ];
    });
}
export function progressUnit(track: ProgressTrack, unit: WeightUnit) {
  return ["weight", "assisted"].includes(track.kind)
    ? unit
    : track.metric === "minutes"
      ? "min"
      : "reps";
}
export function progressLabel(track: ProgressTrack) {
  return track.kind === "assisted"
    ? "Lowest assistance"
    : track.kind === "weight"
      ? "Heaviest recorded set"
      : track.metric === "minutes"
        ? "Most minutes in a set"
        : "Most reps in a set";
}
export function workoutWeek(sessions: WorkoutSession[], now = new Date()) {
  const end = localDay(now),
    startDate = new Date(`${end}T12:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 6);
  const start = startDate.toISOString().slice(0, 10);
  const recent = sessions.filter(
    (s) => s.finishedAt && s.performedOn >= start && s.performedOn <= end,
  );
  return {
    sessions: recent.length,
    sets: recent.reduce(
      (sum, s) =>
        sum +
        s.exercises.reduce(
          (n, ex) => n + ex.sets.filter((set) => set.done).length,
          0,
        ),
      0,
    ),
    minutes: recent.reduce((sum, s) => {
      const minutes = workoutMinutes(s);
      return sum + (minutes <= 1440 ? minutes : 0);
    }, 0),
    uncorrected: recent.filter((s) => workoutMinutes(s) > 1440).length,
  };
}
export function parseWorkoutDuration(value: string): number | undefined {
  if (!value.trim()) return undefined;
  if (!/^\d{1,4}$/.test(value) || Number(value) > 1440)
    throw Error(
      "Enter whole minutes from 0 to 1,440, or leave it blank to use elapsed time.",
    );
  return Number(value);
}
