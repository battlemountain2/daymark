import { test } from "node:test";
import assert from "node:assert/strict";
import { editNotebookNote } from "../src/lib/notebook";
import { makeNotebookBackup, parseNotebookBackup, planNotebookRestore, type NotebookSnapshot } from "../src/lib/notebook-backup";
import { writeStorageBatch } from "../src/lib/storage-batch";
import { syncBatch, type SyncEdit } from "../src/lib/sync-contract";
const empty = (): NotebookSnapshot => ({ notes: {}, drafts: {}, connections: {}, passages: {} });
const note = (id: string, content: string) => ({ ...editNotebookNote(id, "General", content, undefined, 100), title: id, customTitle: true });

test("backup includes saved titles, aliases, drafts, vault copies and passage references", () => {
  const source = { ...empty(), notes: { a: { ...note("a", "Text"), aliases: ["Old name"] } }, drafts: { General: "Captured" }, connections: { l: { from: "a", to: "a", highlight: "h" } }, passages: { h: { file: "pdf", page: 7, quote: "Passage", comment: "Comment" } } };
  const backup = makeNotebookBackup(source, [{ id: "vault", course: "HIST 300", title: "Lecture", rawBody: "Notes", content: "---\nNotes", date: "2026-10-10" }], true, 500);
  const decoded = parseNotebookBackup(JSON.stringify(backup));
  assert.deepEqual(decoded.notes.a, source.notes.a);
  assert.equal(decoded.notes.vault.content, "Notes");
  assert.deepEqual(decoded.drafts, source.drafts);
  assert.deepEqual(decoded.passages, source.passages);
  assert.deepEqual(decoded.connections, source.connections);
  assert.equal(decoded.includesStudyVault, true);
});
test("restore keeps newer writing and remaps cycles, title links, aliases and passage connections to copies", () => {
  const original = { ...empty(), notes: { a: note("a", "Backup A [[b#Sources|B]]\n`[[b]]`\n```md\n[[b]]\n```"), b: note("b", "[[a]]") }, drafts: { General: "Draft [[a]]" }, connections: { l: { from: "a", to: "b", highlight: "h" } }, passages: { h: { file: "pdf", page: 7, quote: "Old passage" } } };
  const current = { ...empty(), notes: { a: note("a", "New A"), b: original.notes.b }, drafts: { General: "New capture" }, passages: { h: { file: "pdf", page: 12, quote: "New passage" } } };
  let id = 0;
  const result = planNotebookRestore(current, makeNotebookBackup(original, [], false, 500), () => `copy-${++id}`);
  assert.deepEqual(result.next.notes.a, current.notes.a);
  assert.deepEqual(result.next.notes.b, current.notes.b);
  assert.equal(result.next.drafts.General, "New capture");
  const a = Object.values(result.next.notes).find(n => n.id !== "a" && n.title === "a")!;
  const b = Object.values(result.next.notes).find(n => n.id !== "b" && n.title === "b")!;
  assert.equal(a.content, `Backup A [[${b.id}#Sources|B]]\n\`[[b]]\`\n\`\`\`md\n[[b]]\n\`\`\``);
  assert.equal(b.content, `[[${a.id}|a]]`);
  assert.equal(Object.values(result.next.notes).find(n => n.title === "Draft [[a]]")!.content, `Draft [[${a.id}|a]]`);
  assert.equal(result.next.connections.l.from, a.id);
  assert.equal(result.next.connections.l.to, b.id);
  assert.equal(result.next.passages[result.next.connections.l.highlight!].page, 7);
  assert.equal(result.next.passages.h.page, 12);
  assert.equal(result.copies, 3);
  const again = planNotebookRestore(result.next, makeNotebookBackup(original, [], false, 500), () => `copy-${++id}`);
  assert.equal(again.added, 0);
  assert.deepEqual(again.next, result.next);
});
test("importing a matching backup keeps notes and connection counts stable", () => {
  const current = { ...empty(), notes: { a: note("a", "[[b]]"), b: note("b", "Text") }, connections: { l: { from: "a", to: "b" } } };
  const result = planNotebookRestore(current, makeNotebookBackup(current, [], false, 500));
  assert.deepEqual(result.next, current);
  assert.equal(result.added, 0);
  assert.equal(result.skipped, 2);
});
test("restore to an empty notebook survives another import without duplicate notes", () => {
  const backup = makeNotebookBackup({ ...empty(), notes: { a: note("a", "Text") }, drafts: { General: "Captured" } }, [], false, 500);
  let id = 0;
  const first = planNotebookRestore(empty(), backup, () => `copy-${++id}`);
  const again = planNotebookRestore(first.next, backup, () => `copy-${++id}`);
  assert.equal(again.added, 0);
  assert.equal(Object.keys(again.next.notes).length, 2);
});
test("malformed backups are rejected before a write can be planned", () => {
  const valid = makeNotebookBackup({ ...empty(), notes: { a: note("a", "Text") } }, [], false, 500);
  for (const raw of ["null", "[]", "not JSON", JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, notes: { a: { ...valid.notes.a, id: "other" } } }), JSON.stringify({ ...valid, notes: { a: { ...valid.notes.a, content: 5 } } }), JSON.stringify({ ...valid, passages: { h: { file: "pdf", page: -1 } } }), JSON.stringify({ ...valid, drafts: JSON.parse('{"__proto__":"text"}') })]) assert.throws(() => parseNotebookBackup(raw));
});
test("storage failure rolls back all notebook values and queued edits", () => {
  const data = new Map([ ["notes", "current writing"], ["queue", "existing edits"] ]);
  let fail = true;
  const storage = { getItem: (k: string) => data.get(k) ?? null, removeItem: (k: string) => { data.delete(k); }, setItem: (k: string, v: string) => { if (k === "links" && fail) { fail = false; throw new Error("quota"); } data.set(k, v); } };
  assert.throws(() => writeStorageBatch(storage, { queue: "import edits", notes: "merged notes", links: "new links" }));
  assert.deepEqual(data, new Map([["notes", "current writing"], ["queue", "existing edits"]]));
});
test("large restored notes sync in bounded batches without skipping queued edits", () => {
  const edits: SyncEdit[] = Array.from({ length: 120 }, (_, i) => ({ namespace: "daymark:notebook", key: `note-${i}`, value: JSON.stringify({ content: '\\"'.repeat(40000) }), version: 0, operation: `operation-${i}` }));
  let queue = edits, total = 0;
  while (queue.length) {
    const batch = syncBatch(queue);
    assert.ok(batch.length > 0 && batch.length <= 100);
    assert.ok(JSON.stringify({ edits: batch }).length < 2000000);
    assert.deepEqual(batch, edits.slice(total, total + batch.length));
    total += batch.length; queue = queue.slice(batch.length);
  }
  assert.equal(total, edits.length);
});
