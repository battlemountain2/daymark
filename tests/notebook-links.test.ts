import { test } from "node:test";
import assert from "node:assert/strict";
import { editNotebookNote } from "../src/lib/notebook";
import {
  backlinks,
  noteIndex,
  noteReference,
  renameNotebook,
  resolveWiki,
  wikiReferences,
  wikiReference,
} from "../src/lib/notebook-links";
const a = {
  ...editNotebookNote("a", "HIST 300", "Water"),
  title: "Water",
  customTitle: true,
};
const b = {
  ...editNotebookNote("b", "GEOG 1150", "Water"),
  title: "Water",
  customTitle: true,
};
test("wiki links resolve aliases, stable ids and course context without guessing ambiguous titles", () => {
  const index = noteIndex({ a, b }, {});
  assert.equal(resolveWiki("Water|a river", index, "HIST 300")[0].id, "a");
  assert.equal(
    resolveWiki("GEOG 1150/Water#Sources", index, "General")[0].id,
    "b",
  );
  assert.equal(resolveWiki("a|Name", index, "General")[0].id, "a");
  assert.equal(resolveWiki("Water", index, "General").length, 2);
  assert.equal(resolveWiki("Missing", index, "General").length, 0);
  assert.deepEqual(wikiReference("[[Water#Sources|River]]"), {
    target: "Water",
    heading: "Sources",
    label: "River",
  });
  assert.equal(
    resolveWiki(
      noteReference(index.find((n) => n.id === b.id)!, index, "HIST 300"),
      index,
      "HIST 300",
    )[0].id,
    "b",
  );
});
test("backlinks deduplicate sources and ignore code examples including unfinished fences", () => {
  const source = editNotebookNote(
    "source",
    "HIST 300",
    "[[Water]] and [[Water|River]]\n`[[Other]]`\n```md\n[[Other]]\n```\n~~~\n[[Other]]",
  );
  const index = noteIndex({ a, source }, {});
  assert.deepEqual(wikiReferences(source.content), ["Water", "Water|River"]);
  assert.deepEqual(
    backlinks("a", index).map((n) => n.id),
    ["source"],
  );
});
test("renaming preserves titles during body edits and keeps existing connections", () => {
  const source = editNotebookNote(
    "source",
    "HIST 300",
    "[[Water#Sources|River]]\n`[[Water]]`",
  );
  const renamed = renameNotebook({ a, b, source }, "a", "Rivers", {}, 500);
  assert.equal(renamed.a.id, "a");
  assert.equal(renamed.a.title, "Rivers");
  assert.equal(renamed.source.content, "[[a#Sources|River]]\n`[[Water]]`");
  assert.equal(renamed.b.title, "Water");
  assert.equal(
    editNotebookNote("a", "HIST 300", "New opening paragraph", renamed.a).title,
    "Rivers",
  );
  assert.equal(
    resolveWiki("Water", noteIndex({ a: renamed.a, b }, {}), "HIST 300")[0].id,
    "a",
  );
  assert.equal(backlinks("a", noteIndex(renamed, {}))[0].id, "source");
});
