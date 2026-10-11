import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trashRecord,
  restoreRecord,
  partitionRecords,
} from "../src/lib/record-recovery";
import {
  readPersonalRecords,
  updatePersonalRecords,
} from "../src/lib/personal-records";
import {
  PROJECT_DRAFTS_KEY,
  readProjectDrafts,
  saveProjectDrafts,
} from "../src/lib/project-drafts";
import { WORKOUT_DAYS } from "../src/lib/fitness-data";
import {
  newWorkoutSession,
  changeLoggedSet,
  finishWorkout,
  workoutMinutes,
  type WorkoutSession,
} from "../src/lib/workout-sessions";
import {
  progressTracks,
  progressPoints,
  parseWorkoutDuration,
  workoutWeek,
} from "../src/lib/workout-progress";
import { splitRecords, joinRecords } from "../src/lib/sync-contract";
import { githubChanges, githubWork } from "../src/lib/github-activity";

function storage(initial: string | null = null) {
  let raw = initial;
  return {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
}

test("Trash survives sync and reload and restores the same identity and latest fields", () => {
  const saved = storage(),
    original = { title: "Hermes", note: "Keep this", next: "Next task" };
  updatePersonalRecords(saved, "daymark:projects", () => ({
    a: trashRecord(original, new Date("2026-10-11T06:00:00Z")),
    b: { title: "Other", note: "" },
  }));
  const synced = joinRecords(
    "daymark:projects",
    splitRecords("daymark:projects", saved.getItem()),
  );
  saved.setItem("daymark:projects", synced);
  const loaded = readPersonalRecords<typeof original>(
      saved,
      "daymark:projects",
    ),
    parts = partitionRecords("daymark:projects", loaded);
  assert.deepEqual(Object.keys(parts.records), ["b"]);
  assert.equal(parts.trash.a.note, "Keep this");
  const changed = { ...parts.trash.a, next: "Updated on another device" };
  assert.deepEqual(restoreRecord(changed), {
    ...original,
    next: "Updated on another device",
  });
  assert.equal(
    trashRecord(parts.trash.a, new Date()).deletedAt,
    parts.trash.a.deletedAt,
  );
});
test("failed Trash writes preserve the live item and other namespaces retain ordinary null behavior", () => {
  const raw = '{"a":{"title":"Keep"}}',
    saved = {
      getItem: () => raw,
      setItem: () => {
        throw Error("Storage full");
      },
    };
  assert.throws(() =>
    updatePersonalRecords<{ title: string }>(
      saved,
      "daymark:projects",
      (current) => ({ ...current, a: trashRecord(current.a) }),
    ),
  );
  assert.equal(saved.getItem(), raw);
  const note = { title: "Old notebook", deletedAt: "kept" };
  assert.deepEqual(partitionRecords("daymark:notebook", { note }).records, {
    note,
  });
  assert.throws(() => restoreRecord(undefined));
});
test("recovery preserves IDs that coincide with object prototype keys", () => {
  const map = JSON.parse('{"__proto__":{"title":"Named item"}}');
  const parts = partitionRecords("daymark:projects", map);
  assert.equal(Object.hasOwn(parts.records, "__proto__"), true);
  assert.equal(Object.keys(parts.records).length, 1);
});
test("project draft backup survives navigation/reload without accepting malformed writing", () => {
  const saved = storage(),
    drafts = { a: { note: "Unsaved paragraph", next: "Fix tests" } };
  saveProjectDrafts(saved, drafts);
  assert.deepEqual(readProjectDrafts(saved), drafts);
  saveProjectDrafts(saved, { a: { next: "Fix tests" } });
  assert.deepEqual(readProjectDrafts(saved), { a: { next: "Fix tests" } });
  for (const invalid of [
    "null",
    "[]",
    '{"a":{"note":42}}',
    '{"a":{"secret":"wrong field"}}',
  ]) {
    saved.setItem(PROJECT_DRAFTS_KEY, invalid);
    assert.throws(() => readProjectDrafts(saved));
    assert.equal(saved.getItem(), invalid);
  }
});
function completed(
  id: string,
  date: string,
  load: string,
  reps: string,
  unit: "lb" | "kg" = "lb",
): WorkoutSession {
  let session = newWorkoutSession(
    WORKOUT_DAYS[1],
    "gym",
    unit,
    [],
    id,
    new Date(`${date}T18:00:00Z`),
  );
  session = changeLoggedSet(session, session.exercises[0].id, 0, {
    weight: load,
    reps,
    done: true,
  });
  return finishWorkout(session, new Date(`${date}T19:00:00Z`));
}
test("progress converts units and excludes incomplete sessions/sets", () => {
  const a = completed("a", "2026-10-08", "100", "8"),
    b = completed("b", "2026-10-09", "50", "6", "kg");
  const unfinished = newWorkoutSession(
    WORKOUT_DAYS[1],
    "gym",
    "lb",
    [],
    "draft",
    new Date("2026-10-10T18:00:00Z"),
  );
  a.exercises[0].sets[1] = { weight: "999", reps: "99", done: false };
  const tracks = progressTracks([a, b, unfinished]);
  assert.equal(tracks.length, 1);
  const points = progressPoints([b, unfinished, a], tracks[0], "kg");
  assert.deepEqual(
    points.map((p) => [p.sessionId, p.value, p.reps]),
    [
      ["a", 45.4, 8],
      ["b", 50, 6],
    ],
  );
});
test("assistance, bodyweight, band, and weighted results use separate comparable tracks", () => {
  const weight = completed("weight", "2026-10-06", "100", "8"),
    assisted = completed("assist", "2026-10-07", "50", "10"),
    body = completed("body", "2026-10-08", "", "14");
  assisted.exercises[0].kind = "assisted";
  assisted.exercises[0].sets[1] = { weight: "30", reps: "7", done: true };
  body.exercises[0].kind = "bodyweight";
  const band = {
    ...body,
    id: "band",
    exercises: body.exercises.map((ex) => ({ ...ex, kind: "band" as const })),
  };
  const tracks = progressTracks([weight, assisted, body, band]);
  assert.equal(tracks.length, 4);
  assert.equal(
    progressPoints(
      [weight, assisted, body, band],
      tracks.find((t) => t.kind === "assisted")!,
      "lb",
    )[0].value,
    30,
  );
  assert.equal(
    progressPoints(
      [weight, assisted, body, band],
      tracks.find((t) => t.kind === "bodyweight")!,
      "lb",
    )[0].value,
    14,
  );
});
test("missing load does not become a zero-weight personal record", () => {
  const session = completed("a", "2026-10-08", "", "8"),
    track = progressTracks([session])[0];
  assert.deepEqual(progressPoints([session], track, "lb"), []);
});
test("corrected durations drive weekly totals and forgotten long sessions require correction", () => {
  const session = completed("a", "2026-10-09", "100", "8");
  session.finishedAt = "2026-10-11T20:00:00Z";
  assert.equal(
    workoutWeek([session], new Date("2026-10-11T21:00:00Z")).minutes,
    0,
  );
  session.durationMinutes = 45;
  assert.equal(workoutMinutes(session), 45);
  assert.deepEqual(workoutWeek([session], new Date("2026-10-11T21:00:00Z")), {
    sessions: 1,
    sets: 1,
    minutes: 45,
    uncorrected: 0,
  });
  assert.equal(parseWorkoutDuration(""), undefined);
  assert.equal(parseWorkoutDuration("0"), 0);
  for (const invalid of ["-1", "1.5", "1441", "abc"])
    assert.throws(() => parseWorkoutDuration(invalid));
  assert.equal(
    workoutWeek([session], new Date("2026-10-20T21:00:00Z")).sessions,
    0,
  );
});
test("GitHub activity links belong to the selected repo and distinguish pull requests from issues", () => {
  const repo = "https://github.com/battlemountain2/daymark";
  assert.deepEqual(
    githubChanges(
      [
        {
          sha: "a",
          html_url: `${repo}/commit/a`,
          commit: {
            message: "Fix save\n\nDetails",
            committer: { date: "2026-10-11" },
          },
        },
        {
          sha: "b",
          html_url: "https://evil.example/a",
          commit: { message: "Wrong" },
        },
      ],
      repo,
    ).map((c) => c.title),
    ["Fix save"],
  );
  const work = githubWork(
    [
      {
        number: 2,
        title: "Issue",
        state: "open",
        html_url: `${repo}/issues/2`,
      },
      {
        number: 3,
        title: "PR",
        state: "open",
        pull_request: {},
        html_url: `${repo}/pull/3`,
      },
      {
        number: 4,
        title: "Closed",
        state: "closed",
        html_url: `${repo}/issues/4`,
      },
    ],
    repo,
  );
  assert.deepEqual(
    work.map((w) => w.kind),
    ["issue", "pull"],
  );
});
