"use client";
import { useEffect, useRef, useState } from "react";
import { usePersonalRecords } from "@/lib/use-personal-records";
import { appendCapture, captureTaskTitle } from '@/lib/quick-capture';
export type CaptureSeed = { title?: string; url?: string };
export default function QuickCapture({
  seed = {},
  onClose,
  onTask,
}: {
  seed?: CaptureSeed;
  onClose: () => void;
  onTask: (title: string) => Promise<boolean>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [text, setText] = useState(seed.title || ""),
    [destination, setDestination] = useState("General"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const notes = usePersonalRecords<string>("hb:scratchpad:v2");
  const projects = usePersonalRecords<{ title: string; note: string }>(
    "daymark:projects",
  );
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  let taskPreview = '', taskError = '';
  if (destination === 'task') {
    try { taskPreview = captureTaskTitle(text, seed.url); }
    catch (e) { taskError = e instanceof Error ? e.message : 'Save this as a note instead.'; }
  }
  return (
    <dialog ref={ref} className="desk-dialog" onCancel={e => { if(busy) e.preventDefault(); else onClose(); }} aria-labelledby="capture-title">
      <div className="desk-dialog-head">
        <h2 id="capture-title">Catch a thought.</h2>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Close capture">
          ✕
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const content = text.trim();
          if (!content || busy) return;
          setBusy(true); setError('');
          try {
            let saved = false;
            if (destination === 'task') {
              saved = await onTask(captureTaskTitle(content, seed.url));
            } else if (destination === 'project') {
              const [title, ...body] = content.split('\n');
              saved = projects.write(crypto.randomUUID(), {
                title:title.slice(0,160), note:appendCapture('',body.join('\n'),seed.url),
              });
            } else if (destination.startsWith('project:')) {
              saved = projects.update(destination.slice(8), current => {
                if (!current) throw new Error('This project was removed. Choose another destination.');
                return {...current, note:appendCapture(current.note,content,seed.url)};
              });
            } else {
              saved = notes.update(destination, current => appendCapture(current,content,seed.url));
            }
            if (saved) onClose();
            else setError('Could not save. Your capture is still here; copy it or try again.');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save. Your capture is still here.');
          } finally { setBusy(false); }
        }}
      >
        <label className="desk-field">
          Note
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            autoFocus
            maxLength={12000}
            disabled={busy}
          />
        </label>
        <label className="desk-field">
          Save to
          <select
            value={destination}
            disabled={busy}
            onChange={(e) => setDestination(e.target.value)}
          >
            <optgroup label="Notebook">
              <option value="General">Personal notebook</option>
              {['HIST 300','GEOG 1150','GEOG 1160','GEOG 1160L','GEOG 1115L'].map(course => <option key={course} value={course}>{course} notes</option>)}
              <option value="Projects">Project idea note</option>
            </optgroup>
            <optgroup label="Projects">
              <option value="project">New personal project</option>
              {Object.entries(projects.records).map(([id, project]) => <option key={id} value={`project:${id}`}>{project.title || 'Untitled project'}</option>)}
            </optgroup>
            <option value="task">School task · today</option>
          </select>
        </label>
        {seed.url && (
          <p className="sub">
            <a href={seed.url} target="_blank" rel="noreferrer">Original message ↗</a>
          </p>
        )}
        {destination === 'task' && <div className="capture-preview"><span className="mono sub">TASK PREVIEW</span><p>{taskPreview || taskError || 'Write a short reminder.'}</p></div>}
        <button type="submit" disabled={busy || !text.trim() || !!taskError}>{busy ? 'Saving…' : 'Save capture'}</button>
        {error && <p role="alert">{error}</p>}
        {(notes.error || projects.error) && (
          <p role="alert">{notes.error || projects.error}</p>
        )}
      </form>
    </dialog>
  );
}
