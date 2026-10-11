"use client";
import { useRouter } from "next/navigation";
import ScratchpadDrawer from "./ScratchpadDrawer";

export default function NotebookWorkspace({ course, noteId }: { course?: string; noteId?: string }) {
  const router = useRouter();
  return <main className="personal-dashboard notebook-workspace">
    <h1 className="notebook-workspace-title">Notebook</h1>
    <ScratchpadDrawer isOpen presentation="page" defaultTag={course} initialNoteId={noteId} onClose={() => router.push("/?space=main")} />
  </main>;
}
