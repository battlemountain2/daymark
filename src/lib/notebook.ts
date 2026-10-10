/** Stable note identities: a course draft is an inbox, never the saved note itself. */
export const NOTEBOOK_KEY = "daymark:notebook";
export type NotebookNote = { id: string; course: string; title: string; content: string; createdAt: number; updatedAt: number };
export function noteTitle(content: string): string {
  const line = content.split(/\r?\n/).find(line => line.trim())?.trim().replace(/^#{1,6}\s+/, "") || "Untitled note";
  return line.length > 64 ? line.slice(0, 61) + "…" : line;
}
export function editNotebookNote(id: string, course: string, content: string, current?: NotebookNote, now = Date.now()): NotebookNote {
  return { id, course, title: noteTitle(content), content, createdAt: current?.createdAt ?? now, updatedAt: now };
}
