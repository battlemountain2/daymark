import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readPersonalRecords,
  updatePersonalRecords,
  patchExistingRecord,
} from "../src/lib/personal-records";

function storage(initial: string | null) {
  let raw = initial;
  return {
    getItem: () => raw,
    setItem: (_key: string, next: string) => {
      raw = next;
    },
  };
}

test("unreadable collection data cannot be overwritten by an edit", () => {
  for (const raw of ["null", "[]", "42", '"text"', "{broken"]) {
    const saved = storage(raw);
    assert.throws(() => readPersonalRecords(saved, "projects"));
    assert.throws(() =>
      updatePersonalRecords(saved, "projects", () => ({ new: {} })),
    );
    assert.equal(saved.getItem(), raw);
  }
  assert.deepEqual(readPersonalRecords(storage(null), "projects"), {});
});

test("sequential edits merge the latest stored fields rather than a stale render", () => {
  const saved = storage(
    JSON.stringify({
      a: { title: "Original", note: "" },
      b: { title: "Other", note: "" },
    }),
  );
  type Project = { title: string; note: string };
  updatePersonalRecords<Project>(saved, "projects", (current) => ({
    ...current,
    a: patchExistingRecord(current.a, { note: "From another tab" }),
  }));
  const next = updatePersonalRecords<Project>(saved, "projects", (current) => ({
    ...current,
    a: patchExistingRecord(current.a, { title: "Renamed" }),
  }));
  assert.deepEqual(next.a, { title: "Renamed", note: "From another tab" });
  assert.deepEqual(next.b, { title: "Other", note: "" });
});

test("an edit to a removed item fails without silently dropping the draft or restoring the item", () => {
  const saved = storage("{}");
  assert.throws(
    () =>
      updatePersonalRecords<{ note: string }>(saved, "projects", (current) => ({
        ...current,
        gone: patchExistingRecord(current.gone, { note: "Unsaved writing" }),
      })),
    /no longer available/,
  );
  assert.equal(saved.getItem(), "{}");
});

test("storage failures propagate and leave the previous saved copy intact", () => {
  const saved = {
    getItem: () => '{"a":{"note":"Original"}}',
    setItem: () => {
      throw Error("Storage full");
    },
  };
  assert.throws(
    () =>
      updatePersonalRecords(saved, "projects", () => ({
        a: { note: "New draft" },
      })),
    /Storage full/,
  );
  assert.equal(saved.getItem(), '{"a":{"note":"Original"}}');
});
