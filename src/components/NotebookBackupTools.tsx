"use client";
import { useRef, useState } from "react";
import { cloudStorage } from "@/lib/cloud-storage";
import { makeNotebookBackup, MAX_BACKUP_BYTES, parseNotebookBackup, planNotebookRestore, readNotebookSnapshot, type NotebookBackup } from "@/lib/notebook-backup";

export default function NotebookBackupTools({ prepare }: { prepare: () => boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<NotebookBackup | null>(null);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<{ added: number; copies: number; skipped: number } | null>(null);
  async function download() {
    if (!prepare()) return;
    setBusy(true); setMessage("");
    try {
      let vault = [], included = false;
      try {
        const response = await fetch("/api/vault", { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error();
        const notes = (await response.json()).notes;
        if (!Array.isArray(notes)) throw new Error();
        vault = notes;
        included = true;
      } catch { /* Local writing can still be backed up while offline. */ }
      const data = makeNotebookBackup(readNotebookSnapshot(cloudStorage.getItem), vault, included);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `daymark-notebook-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(included ? "Backup downloaded, including study-vault notes." : "Local notebook backup downloaded. Study-vault notes could not be included; try again when connected.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create a backup. Your notes are unchanged."); }
    finally { setBusy(false); }
  }
  async function select(file?: File) {
    setBackup(null); setSummary(null); setMessage("");
    if (!file) return;
    if (!prepare()) return;
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Choose a notebook backup smaller than 10 MB.");
      const data = parseNotebookBackup(await file.text());
      const plan = planNotebookRestore(readNotebookSnapshot(cloudStorage.getItem), data);
      setBackup(data); setFilename(file.name); setSummary(plan);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not read this backup."); }
    finally { setBusy(false); }
  }
  function restore() {
    if (!backup || !prepare()) return;
    try {
      // Re-read immediately before applying so writing/sync since preview is retained.
      const plan = planNotebookRestore(readNotebookSnapshot(cloudStorage.getItem), backup);
      cloudStorage.setItems(plan.writes);
      window.dispatchEvent(new Event("daymark:cloud-updated"));
      setBackup(null); setSummary(null);
      setMessage(`Added ${plan.added} ${plan.added === 1 ? "note" : "notes"}${plan.copies ? `, including ${plan.copies} separate ${plan.copies === 1 ? "copy" : "copies"}` : ""}. Existing writing was kept. Changes are queued for sync.`);
    } catch { setMessage("Could not restore on this device. Free some storage and try again; your existing notes were kept."); }
  }
  return <details className="notebook-backup-tools">
    <summary>Backup & restore</summary>
    <div className="notebook-backup-content">
      <p>Download your notes, course drafts, study-vault copies and connections. Passage references are included; PDF files and flashcards stay separate.</p>
      <div className="notebook-backup-actions">
        <button type="button" disabled={busy} onClick={() => void download()}>{busy ? "Working…" : "Download notebook backup"}</button>
        <button type="button" disabled={busy} onClick={() => input.current?.click()}>Choose backup to restore</button>
        <input ref={input} aria-label="Notebook backup file" type="file" accept=".json,application/json" hidden onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void select(file); }} />
      </div>
      {backup && summary && <div className="notebook-restore-preview">
        <strong>{filename}</strong>
        <p>{summary.added} {summary.added === 1 ? "note" : "notes"} to add · {summary.copies} conflict {summary.copies === 1 ? "copy" : "copies"} · {summary.skipped} unchanged {summary.skipped === 1 ? "item" : "items"}.</p>
        <p>Existing notes will stay intact. Different versions become separate notes. Study-vault copies restore into this notebook. Source PDFs must still be available to open passage links.</p>
        <button type="button" onClick={restore}>Add notes from this backup</button>
        <button type="button" onClick={() => { setBackup(null); setSummary(null); }}>Cancel</button>
      </div>}
      {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
