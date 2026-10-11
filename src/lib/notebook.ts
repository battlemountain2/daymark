/** Stable note identities: a course draft is an inbox, never the saved note itself. */
export const NOTEBOOK_KEY = "daymark:notebook";
export type NotebookNote = {
  id: string;
  course: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  aliases?: string[];
  customTitle?: boolean;
  restoredFrom?: string;
  restoredAt?: number;
  restoreFingerprint?: string;
  deletedAt?: number;
};
export function noteTitle(content: string): string {
  const line =
    content
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim()
      .replace(/^#{1,6}\s+/, "") || "Untitled note";
  return line.length > 64 ? line.slice(0, 61) + "…" : line;
}
export function editNotebookNote(
  id: string,
  course: string,
  content: string,
  current?: NotebookNote,
  now = Date.now(),
): NotebookNote {
  return {
    id,
    course,
    title: current?.customTitle ? current.title : noteTitle(content),
    ...(current?.customTitle ? { customTitle: true } : {}),
    ...(current?.aliases ? { aliases: current.aliases } : {}),
    ...(current?.deletedAt !== undefined ? { deletedAt: current.deletedAt } : {}),
    ...(current?.restoredFrom ? { restoredFrom: current.restoredFrom, restoredAt: current.restoredAt, restoreFingerprint: current.restoreFingerprint } : {}),
    content,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Keep the identity and writing so links recover when a note is restored. */
export function trashNotebookNote(note: NotebookNote, now = Date.now()): NotebookNote {
  return note.deletedAt !== undefined ? note : { ...note, deletedAt: now, updatedAt: now };
}
export function restoreNotebookNote(note: NotebookNote, now = Date.now()): NotebookNote {
  if (note.deletedAt === undefined) return note;
  const { deletedAt: _deletedAt, ...restored } = note;
  return { ...restored, updatedAt: now };
}
