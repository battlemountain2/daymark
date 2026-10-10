import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contextPool,
  inPastWeek,
  type SavedMedia,
} from "../src/lib/media-context";
import { releasesFor, validFollow } from "../src/lib/release-radar";
const base = { kind: "movie", url: "https://example.com", detail: "Saved" };
test("time-limited picks exclude unknown runtimes, finished items and duplicates", () => {
  const items: SavedMedia[] = [
    { ...base, id: "a", title: "Unknown" },
    {
      ...base,
      id: "b",
      title: "Short",
      minutes: 25,
      company: "friends",
      shelf: "shared",
    },
    { ...base, id: "c", title: "Long", minutes: 130 },
    {
      ...base,
      id: "d",
      title: "Finished",
      minutes: 20,
      finished: "2026-10-02",
    },
    { ...base, id: "b", title: "Duplicate", minutes: 25 },
  ];
  assert.deepEqual(
    contextPool(items, {
      kind: "movie",
      budget: 30,
      company: "friends",
      shelf: "shared",
    }).map((p) => p.id),
    ["b"],
  );
  assert.deepEqual(
    contextPool(items, {
      kind: "movie",
      budget: 30,
      company: "solo",
      shelf: "",
    }),
    [],
  );
  assert.equal(inPastWeek("2026-10-02", Date.parse("2026-10-03")), true);
  assert.equal(inPastWeek("2026-10-04", Date.parse("2026-10-03")), false);
  assert.equal(inPastWeek(undefined), false);
});
test("radar validates IDs and excludes undated or distant TV episodes", async () => {
  assert.equal(validFollow("tvmaze", "1/../../secret"), false);
  assert.equal(validFollow("musicbrainz", "http://localhost"), false);
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json([
      {
        id: 1,
        name: "Known",
        airdate: "2026-10-04",
        season: 1,
        number: 3,
        url: "https://www.tvmaze.com/episodes/1",
      },
      { id: 2, name: "Unknown", airdate: "", season: 1, number: 4 },
      { id: 3, name: "Old", airdate: "2020-01-01", season: 1, number: 1 },
    ]);
  try {
    const releases = await releasesFor("tvmaze", "1", new Date("2026-10-03"));
    assert.equal(releases.length, 1);
    assert.equal(releases[0].date, "2026-10-04");
    assert.equal(releases[0].source, "TVmaze");
  } finally {
    globalThis.fetch = original;
  }
});
