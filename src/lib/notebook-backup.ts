import { NOTEBOOK_KEY, noteTitle, type NotebookNote } from "./notebook";
import { noteIndex, resolveWiki, wikiReference } from "./notebook-links";

export const DRAFTS_KEY = "hb:scratchpad:v2";
export const CONNECTIONS_KEY = "daymark:note-links";
export const PASSAGES_KEY = "daymark:highlights";
export const MAX_BACKUP_BYTES = 10_000_000;
export type NoteConnection = { from: string; to: string; highlight?: string };
export type NotePassage = { file: string; page: number; quote?: string; comment?: string };
export type NotebookSnapshot = {
  notes: Record<string, NotebookNote>;
  drafts: Record<string, string>;
  connections: Record<string, NoteConnection>;
  passages: Record<string, NotePassage>;
};
export type NotebookBackup = NotebookSnapshot & { format: "daymark-notebook"; version: 1; exportedAt: number; includesStudyVault: boolean };
const reserved = new Set(["__proto__", "constructor", "prototype"]);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 500): value is string => typeof value === "string" && value.length <= max;
const identity = (value: unknown): value is string => text(value) && !!value.trim() && !reserved.has(value);
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function records<T>(value: unknown, valid: (entry: unknown, id: string) => boolean): Record<string, T> {
  if (!object(value) || Object.keys(value).length > 5000) throw new Error("This backup contains an invalid collection.");
  const result: Record<string, T> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (!identity(id) || !valid(entry, id) || JSON.stringify(entry).length > 240000) throw new Error("This backup contains an invalid or oversized item.");
    result[id] = entry as T;
  }
  return result;
}
export function parseNotebookBackup(raw: string): NotebookBackup {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) throw new Error("Choose a notebook backup smaller than 10 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("This file is not a readable notebook backup."); }
  if (!object(value) || value.format !== "daymark-notebook" || value.version !== 1 || !timestamp(value.exportedAt) || typeof value.includesStudyVault !== "boolean") throw new Error("Choose a Daymark notebook backup (version 1).");
  const notes = records<NotebookNote>(value.notes, (n, id) => object(n) && n.id === id && identity(n.course) && text(n.title, 2000) && text(n.content, 200000) && timestamp(n.createdAt) && timestamp(n.updatedAt) && (n.deletedAt === undefined || timestamp(n.deletedAt)) && (n.customTitle === undefined || typeof n.customTitle === "boolean") && (n.restoredFrom === undefined || identity(n.restoredFrom)) && (n.restoredAt === undefined || timestamp(n.restoredAt)) && (n.restoreFingerprint === undefined || text(n.restoreFingerprint, 100)) && (n.aliases === undefined || Array.isArray(n.aliases) && n.aliases.length <= 100 && n.aliases.every(a => text(a, 2000))));
  const drafts = records<string>(value.drafts, d => text(d, 200000));
  const connections = records<NoteConnection>(value.connections, c => object(c) && identity(c.from) && identity(c.to) && (c.highlight === undefined || identity(c.highlight)));
  const passages = records<NotePassage>(value.passages, p => object(p) && identity(p.file) && typeof p.page === "number" && Number.isSafeInteger(p.page) && p.page > 0 && p.page <= 100000 && (p.quote === undefined || text(p.quote, 200000)) && (p.comment === undefined || text(p.comment, 200000)));
  return { format: "daymark-notebook", version: 1, exportedAt: value.exportedAt, includesStudyVault: value.includesStudyVault, notes, drafts, connections, passages };
}
export function readNotebookSnapshot(getItem: (key: string) => string | null): NotebookSnapshot {
  return { notes: JSON.parse(getItem(NOTEBOOK_KEY) || "{}"), drafts: JSON.parse(getItem(DRAFTS_KEY) || "{}"), connections: JSON.parse(getItem(CONNECTIONS_KEY) || "{}"), passages: JSON.parse(getItem(PASSAGES_KEY) || "{}") };
}
export function makeNotebookBackup(snapshot: NotebookSnapshot, vault: { id: string; course: string; title: string; content: string; rawBody: string; date: string }[] = [], includesStudyVault = false, now = Date.now()): NotebookBackup {
  const notes = { ...snapshot.notes };
  for (const n of vault) {
    if (notes[n.id]) continue;
    const date = Date.parse(n.date);
    notes[n.id] = { id: n.id, course: n.course, title: n.title, content: n.rawBody || n.content, customTitle: true, createdAt: Number.isFinite(date) && date >= 0 ? date : now, updatedAt: Number.isFinite(date) && date >= 0 ? date : now };
  }
  return parseNotebookBackup(JSON.stringify({ ...snapshot, notes, format: "daymark-notebook", version: 1, exportedAt: now, includesStudyVault }));
}
function sameNote(a: NotebookNote, b: NotebookNote) {
  return a.deletedAt === b.deletedAt && a.title === b.title && a.course === b.course && a.content === b.content && Boolean(a.customTitle) === Boolean(b.customTitle) && JSON.stringify(a.aliases || []) === JSON.stringify(b.aliases || []);
}
function fingerprint(note: NotebookNote) {
  const raw = JSON.stringify([note.course, note.title, note.content, note.customTitle || false, note.aliases || [], note.deletedAt ?? null]);
  let first = 2166136261, second = 5381;
  for (let i = 0; i < raw.length; i++) { first = Math.imul(first ^ raw.charCodeAt(i), 16777619); second = Math.imul(second, 33) ^ raw.charCodeAt(i); }
  return `${first >>> 0}-${second >>> 0}`;
}
function rewriteConnections(content: string, course: string, index: ReturnType<typeof noteIndex>, mapped: Map<string, string>) {
  let fence: string | null = null;
  return content.split("\n").map(line => {
    const marker = line.trim().match(/^(`{3,}|~{3,})/)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      return line;
    }
    if (fence) return line;
    return line.split(/(`+[^`]*`+)/g).map(part => part.startsWith("`") ? part : part.replace(/\[\[([^\]\n]+)\]\]/g, (original, reference: string) => {
      const matches = resolveWiki(reference, index, course);
      if (matches.length !== 1) return original;
      const target = mapped.get(matches[0].id);
      if (!target || target === matches[0].id) return original;
      const parsed = wikiReference(reference);
      return `[[${target}${parsed.heading ? `#${parsed.heading}` : ""}|${parsed.label}]]`;
    })).join("");
  }).join("\n");
}
/** Additive restore: existing notes and drafts are never replaced. */
export function planNotebookRestore(current: NotebookSnapshot, backup: NotebookBackup, newId: () => string = () => `note-${crypto.randomUUID()}`) {
  const next: NotebookSnapshot = { notes: { ...current.notes }, drafts: { ...current.drafts }, connections: { ...current.connections }, passages: { ...current.passages } };
  const mapped = new Map<string, string>(), highlights = new Map<string, string>();
  const backupIndex = [...Object.values(backup.notes).map(n => ({...n,kind:"note" as const})), ...noteIndex({},backup.drafts)];
  let added = 0, copies = 0, skipped = 0;
  const imported: NotebookNote[] = [];
  const sourceNotes = [...Object.values(backup.notes)];
  const importedIds = new Set<string>();
  function available(collection: Record<string, unknown>) { let id; do { id = newId(); } while (Object.hasOwn(collection, id)); return id; }
  for (const note of Object.values(backup.notes)) {
    const existing = current.notes[note.id];
    const priorCopy = Object.values(current.notes).find(n => n.restoredFrom === note.id && n.restoreFingerprint === fingerprint(note));
    if (priorCopy) { mapped.set(note.id, priorCopy.id); skipped++; continue; }
    if (existing && sameNote(existing, note)) { mapped.set(note.id, note.id); skipped++; continue; }
    const id = existing ? available(next.notes) : note.id;
    mapped.set(note.id, id);
    const entry = { ...note, id, restoredFrom: note.id, restoredAt: Date.now(), restoreFingerprint: fingerprint(note) };
    next.notes[id] = entry;
    imported.push(entry);
    importedIds.add(id);
    added++;
    if (existing) copies++;
  }
  for (const [course, content] of Object.entries(backup.drafts)) {
    if (!content.trim()) continue;
    const source = { id: course, course, title: noteTitle(content), content, createdAt: backup.exportedAt, updatedAt: backup.exportedAt };
    sourceNotes.push(source);
    if (current.drafts[course] === content) { mapped.set(course, course); skipped++; continue; }
    const restored = Object.values(current.notes).find(note => note.restoredFrom === course && note.restoreFingerprint === fingerprint(source));
    if (restored) { mapped.set(course, restored.id); skipped++; continue; }
    // Drafts become saved notes so a later capture cannot replace restored writing.
    const id = available(next.notes);
    mapped.set(course, id);
    const note: NotebookNote = { ...source, id, restoredFrom: course, restoredAt: Date.now(), restoreFingerprint: fingerprint(source) };
    next.notes[id] = note;
    imported.push(note);
    importedIds.add(id);
    added++;
    if (current.drafts[course]?.trim()) copies++;
  }
  // Even an unchanged source needs a copy when its link must follow a restored
  // target. Repeat to preserve chains/cycles without changing existing writing.
  let changed = true;
  while (changed) {
    changed = false;
    for (const note of sourceNotes) {
      const target = mapped.get(note.id)!;
      if (importedIds.has(target)) continue;
      const content = rewriteConnections(note.content, note.course, backupIndex, mapped);
      const existing = current.notes[target];
      // Digest only identifies candidates. Actual text is always compared.
      if (existing ? sameNote(existing, { ...note, content }) : current.drafts[target] === content) continue;
      const prior = Object.values(current.notes).find(n => n.restoredFrom === note.id && n.restoreFingerprint === fingerprint(note) && sameNote(n, { ...note, content }));
      if (prior && prior.id !== target) { mapped.set(note.id, prior.id); changed = true; continue; }
      const id = available(next.notes), entry = { ...note, id, restoredFrom: note.id, restoredAt: Date.now(), restoreFingerprint: fingerprint(note) };
      mapped.set(note.id, id); next.notes[id] = entry; imported.push(entry);
      importedIds.add(id);
      added++; copies++; skipped--; changed = true;
    }
  }
  for (const note of imported) next.notes[note.id] = { ...note, content: rewriteConnections(note.content, note.course, backupIndex, mapped) };
  for (const [id, p] of Object.entries(backup.passages)) {
    const same = Object.entries(next.passages).find(([, item]) => item.file === p.file && item.page === p.page && item.quote === p.quote && item.comment === p.comment)?.[0];
    const target = same || (next.passages[id] ? available(next.passages) : id);
    highlights.set(id, target);
    if (!same) next.passages[target] = p;
  }
  for (const [id, connection] of Object.entries(backup.connections)) {
    const entry = { ...connection, from: mapped.get(connection.from) || connection.from, to: mapped.get(connection.to) || connection.to, ...(connection.highlight ? { highlight: highlights.get(connection.highlight) || connection.highlight } : {}) };
    if (Object.values(next.connections).some(item => item.from === entry.from && item.to === entry.to && item.highlight === entry.highlight)) continue;
    next.connections[next.connections[id] ? available(next.connections) : id] = entry;
  }
  const writes = { [NOTEBOOK_KEY]: JSON.stringify(next.notes), [DRAFTS_KEY]: JSON.stringify(next.drafts), [CONNECTIONS_KEY]: JSON.stringify(next.connections), [PASSAGES_KEY]: JSON.stringify(next.passages) };
  return { next, writes, added, copies, skipped };
}
