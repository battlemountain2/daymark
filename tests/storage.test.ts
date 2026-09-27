import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyRecords, readRecords } from "../src/lib/sync-db";
import { splitRecords, joinRecords } from "../src/lib/sync-contract";
import { db } from "../src/lib/db";
import { saveVaultNote, listVaultNotes } from "../src/lib/vault";
import { getDueCards, calculateNextSRS, INITIAL_SRS_STATE } from "../src/lib/spaced-repetition";
import type { Flashcard } from "../src/lib/study-hub-types";

test("cloud records preserve independent edits, retries, tombstones and conflicting versions", async () => {
  process.env.TURSO_DATABASE_URL = `file:${join(await mkdtemp(join(tmpdir(), "daymark-test-")), "test.db")}`;
  const a = { namespace: "hb:scratchpad:v2", key: "General", value: JSON.stringify("first"), version: 0, operation: "a" };
  assert.deepEqual(await applyRecords([a]), []);
  assert.deepEqual(await applyRecords([a]), []);
  assert.equal((await readRecords())[0].version, 1);
  await applyRecords([{ ...a, key: "HIST 300", operation: "b" }]);
  assert.equal((await readRecords()).length, 2);
  await applyRecords([{ ...a, value: JSON.stringify("phone edit"), version: 1, operation: "c" }]);
  assert.deepEqual(await applyRecords([{ ...a, value: JSON.stringify("laptop edit"), version: 1, operation: "d" }]), ["d"]);
  assert.equal((await readRecords()).find(r => r.key === "General")?.value, JSON.stringify("phone edit"));
  const conflict = await db().execute("SELECT value,conflict FROM personal_history WHERE operation='d'");
  assert.equal(conflict.rows[0].value, JSON.stringify("laptop edit"));
  assert.equal(conflict.rows[0].conflict, 1);
  await applyRecords([{ ...a, value: null, version: 2, operation: "e" }]);
  assert.equal((await readRecords()).find(r => r.key === "General")?.value, null);
  assert.deepEqual(await applyRecords([{ ...a, operation: "legacy", migration: true }]), ["legacy"]);
});
test("array records round-trip without dropping unrelated cards", () => {
  const cards = [{ id: "a", front: "A" }, { id: "b", front: "B" }];
  assert.deepEqual(JSON.parse(joinRecords("hb:custom-anki-cards", splitRecords("hb:custom-anki-cards", JSON.stringify(cards)))), cards);
});
test("vault persists distinct same-title notes in the database", async () => {
  const params = { course: "Test", title: "Same title", content: "My lecture notes" };
  const a = await saveVaultNote(params), b = await saveVaultNote(params);
  assert.notEqual(a.id, b.id);
  assert.equal((await listVaultNotes("Test")).length, 2);
  assert.equal((await listVaultNotes("Test"))[0].content, params.content);
});
test("daily study queue limits new cards without dropping due reviews", () => {
  const cards = Array.from({length: 30}, (_,i) => ({ id: String(i) }) as Flashcard);
  assert.equal(getDueCards(cards, "2026-09-26", {}).length, 10);
  const reviewed = calculateNextSRS(INITIAL_SRS_STATE("0"), 3, "2026-09-26");
  assert.equal(getDueCards(cards, "2026-09-26", { "0": reviewed }).length, 9);
  const due = { ...reviewed, dueDate: "2026-09-25", history: [{ date: "2026-09-20", grade: 3 as const }] };
  assert.equal(getDueCards(cards, "2026-09-26", { "0": due }).length, 11);
});
after(() => db().close());
