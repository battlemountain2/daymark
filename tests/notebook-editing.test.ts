import { test } from "node:test";
import assert from "node:assert/strict";
import { continueNoteList, formatNote, recordEdit, type EditHistory } from "../src/lib/notebook-editing";
test("formatting applies to selected lines without touching the next line", () => {
  assert.deepEqual(formatNote("one\ntwo\nthree", { start: 0, end: 8 }, "checklist"), { content: "- [ ] one\n- [ ] two\nthree", start: 0, end: 19 });
  assert.equal(formatNote("- [ ] one\n- [ ] two", { start: 0, end: 19 }, "checklist").content, "one\ntwo");
  assert.equal(formatNote("\nnext", { start: 0, end: 0 }, "heading").content, "## \nnext");
  assert.deepEqual(formatNote("an idea", { start: 3, end: 7 }, "bold"), { content: "an **idea**", start: 5, end: 9 });
});
test("Enter continues and exits lists and ignores fenced examples", () => {
  assert.deepEqual(continueNoteList("- [x] Read", { start: 10, end: 10 }), { content: "- [x] Read\n- [ ] ", start: 17, end: 17 });
  assert.deepEqual(continueNoteList("9. item", { start: 7, end: 7 }), { content: "9. item\n10. ", start: 12, end: 12 });
  assert.deepEqual(continueNoteList("- [ ] ", { start: 6, end: 6 }), { content: "", start: 0, end: 0 });
  assert.equal(continueNoteList("```md\n- item", { start: 12, end: 12 }), null);
  assert.equal(continueNoteList("plain", { start: 5, end: 5 }), null);
});
test("undo groups typing, separates formatting, drops abandoned redo and resets after remote edits", () => {
  const edit = (content: string) => ({ content, start: content.length, end: content.length });
  let history: EditHistory = { entries: [edit("")], position: 0, at: 0, typing: false };
  history = recordEdit(history, edit(""), edit("a"), true, 1000);
  history = recordEdit(history, edit("a"), edit("ab"), true, 1100);
  assert.deepEqual(history.entries.map(e => e.content), ["", "ab"]);
  history = recordEdit(history, edit("ab"), edit("**ab**"), false, 1200);
  assert.deepEqual(history.entries.map(e => e.content), ["", "ab", "**ab**"]);
  history.position = 1;
  history = recordEdit(history, edit("ab"), edit("abc"), true, 1500);
  assert.deepEqual(history.entries.map(e => e.content), ["", "ab", "abc"]);
  history = recordEdit(history, edit("from another device"), edit("edited again"), true, 2000);
  assert.deepEqual(history.entries.map(e => e.content), ["from another device", "edited again"]);
});
