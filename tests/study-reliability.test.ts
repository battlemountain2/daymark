import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAnkiCsv } from "../src/lib/study-hub-types";
import { localDay } from "../src/lib/localtime";
import { calculateNextSRS, INITIAL_SRS_STATE, saveSRSCard, getDueCards } from "../src/lib/spaced-repetition";
import { remainingStudyMinutes } from "../src/lib/schedule";

test("negative and unknown CSV statuses cannot become source-verified", () => {
  for (const [raw, expected] of Object.entries({
    Verified: "Verified", " VERIFIED ": "Verified", Unverified: "Draft", "Not verified": "Draft",
    "Verified?": "Draft", "Needs   review": "Needs review", Review: "Needs review", Exported: "Exported", "": "Draft",
  })) {
    const card = parseAnkiCsv(`id,front,back,source,tags,status\na,Question,Answer,Source,GEOG1160,${raw}`)[0];
    assert.equal(card.status, expected, raw);
  }
});

test("default review scheduling uses the Mountain day at evening, midnight and DST boundaries", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-11T01:30:00Z") });
  assert.equal(INITIAL_SRS_STATE("a").dueDate, "2026-10-10");
  const reviewed = calculateNextSRS(INITIAL_SRS_STATE("a"), 3);
  assert.equal(reviewed.dueDate, "2026-10-11");
  assert.equal(reviewed.history[0].date, "2026-10-10");
  assert.equal(getDueCards([{ id: "a" }, { id: "b" }] as Parameters<typeof getDueCards>[0], localDay(), { a: reviewed }).length, 1);
  t.mock.timers.setTime(new Date("2026-10-11T06:00:00Z").getTime());
  assert.equal(INITIAL_SRS_STATE("b").dueDate, "2026-10-11");
  for (const [instant, day] of [
    ["2026-03-08T08:59:00Z", "2026-03-08"], ["2026-03-08T09:01:00Z", "2026-03-08"],
    ["2026-11-01T07:59:00Z", "2026-11-01"], ["2026-11-01T08:01:00Z", "2026-11-01"],
    ["2026-11-10T06:59:00Z", "2026-11-09"], ["2026-11-10T07:00:00Z", "2026-11-10"],
  ]) assert.equal(localDay(new Date(instant)), day);
});

test("a failed review write reports failure and can retry without dropping independent reviews", () => {
  const prior = calculateNextSRS(INITIAL_SRS_STATE("other"), 3, "2026-10-10");
  let raw = JSON.stringify({ other: prior }), blocked = true;
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => {if (blocked) throw Error("Storage full");raw = value;} };
  const state = calculateNextSRS(INITIAL_SRS_STATE("current"), 1, "2026-10-10");
  assert.throws(() => saveSRSCard(state, storage), /Storage full/);
  assert.deepEqual(JSON.parse(raw), { other: prior });
  blocked = false;
  assert.deepEqual(saveSRSCard(state, storage), { other: prior, current: state });
  assert.equal(JSON.parse(raw).current.history.length, 1);
  const unreadable = { getItem: () => "corrupted", setItem: () => assert.fail("Must not erase existing review data") };
  assert.throws(() => saveSRSCard(state, unreadable));
});

test("focus windows use time remaining, retain future gaps and reserve travel time", () => {
  assert.equal(remainingStudyMinutes("10:00", "11:00", 10 * 60 + 45), 15);
  assert.equal(remainingStudyMinutes("10:00", "11:00", 10 * 60 + 45, 10), 5);
  assert.equal(remainingStudyMinutes("10:00", "11:00", 9 * 60, 10), 50);
  assert.equal(remainingStudyMinutes("10:00", "11:00", 10 * 60 + 55, 10), 0);
  assert.equal(remainingStudyMinutes("10:00", "11:00", 11 * 60 + 1), 0);
  assert.equal(remainingStudyMinutes("10:00", "11:00", NaN), 0);
});
