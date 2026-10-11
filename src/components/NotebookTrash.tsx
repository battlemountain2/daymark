"use client";
import type { NotebookNote } from "@/lib/notebook";

export default function NotebookTrash({ notes, lastDeleted, onRestore }: {
  notes: NotebookNote[];
  lastDeleted: string | null;
  onRestore: (id: string) => void;
}) {
  const recent = notes.find(note => note.id === lastDeleted);
  return <div className="notebook-trash">
    {recent && <div className="notebook-trash-undo" role="status"><span>“{recent.title}” moved to Trash.</span><button type="button" onClick={() => onRestore(recent.id)}>Undo delete</button></div>}
    <details>
      <summary>Trash · {notes.length}</summary>
      <p className="sub">Deleted notes stay here until you restore them. Their writing and connections are kept.</p>
      {!notes.length && <p className="sub">No deleted notes.</p>}
      {notes.map(note => <div className="notebook-trash-row" key={note.id}><div><strong>{note.title}</strong><small>{note.course}</small></div><button type="button" aria-label={`Restore ${note.title}`} onClick={() => onRestore(note.id)}>Restore</button></div>)}
    </details>
  </div>;
}
