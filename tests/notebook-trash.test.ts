import { test } from "node:test";
import assert from "node:assert/strict";
import { editNotebookNote, trashNotebookNote, restoreNotebookNote } from "../src/lib/notebook";
import { noteIndex, resolveWiki, backlinks } from "../src/lib/notebook-links";
import { makeNotebookBackup, parseNotebookBackup, planNotebookRestore } from "../src/lib/notebook-backup";

test("trash hides linked notes and restore recovers their identity, writing and backlinks", () => {
  const a = { ...editNotebookNote("a","General","Important writing",undefined,100), title:"Watersheds", aliases:["Catchments"],customTitle:true };
  const b = editNotebookNote("b","General","[[a|Watersheds]] and [[Catchments]]",undefined,100);
  const deleted = trashNotebookNote(a,200);
  assert.equal(noteIndex({a:deleted,b},{}).length,1);
  assert.deepEqual(resolveWiki("a",noteIndex({a:deleted,b},{}),"General"),[]);
  const restored = restoreNotebookNote(deleted,300);
  assert.equal(restored.id,a.id);
  assert.equal(restored.content,a.content);
  assert.deepEqual(restored.aliases,a.aliases);
  assert.equal(backlinks("a",noteIndex({a:restored,b},{}))[0].id,"b");
  assert.deepEqual(resolveWiki("Catchments",noteIndex({a:restored,b},{}),"General").map(n=>n.id),["a"]);
});

test("deleted writing survives backups, repeat imports and vault inclusion without resurfacing", () => {
  const a = trashNotebookNote(editNotebookNote("vault","General","Original",undefined,100),200);
  const current = { notes:{vault:a},drafts:{},connections:{l:{from:"vault",to:"other"}},passages:{} };
  const backup = makeNotebookBackup(current,[{id:"vault",course:"General",title:"Vault",rawBody:"Source",content:"Source",date:"2026-10-10"}],true,500);
  assert.equal(backup.notes.vault.content,"Original");
  assert.equal(backup.notes.vault.deletedAt,200);
  const imported = planNotebookRestore({notes:{},drafts:{},connections:{},passages:{}},backup);
  assert.equal(noteIndex(imported.next.notes,{}).length,0);
  assert.equal(imported.next.connections.l.from,"vault");
  assert.equal(planNotebookRestore(imported.next,backup).added,0);
  assert.throws(()=>parseNotebookBackup(JSON.stringify({...backup,notes:{vault:{...a,deletedAt:-1}}})));
});

test("editing a stale deleted note cannot silently clear its trash state", () => {
  const deleted = trashNotebookNote(editNotebookNote("a","General","Text",undefined,100),200);
  assert.equal(editNotebookNote("a","General","Later text",deleted,300).deletedAt,200);
  assert.equal(trashNotebookNote(deleted,400).deletedAt,200);
});
