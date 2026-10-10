"use client";
import { useState } from "react";
import { usePersonalRecords } from "@/lib/use-personal-records";
type Project = { title: string; note: string; next?: string };
export default function ProjectShelf() {
  const { records, write, error } =
      usePersonalRecords<Project>("daymark:projects"),
    [selected, setSelected] = useState<string | null>(null),
    [removed, setRemoved] = useState<{id:string;project:Project} | null>(null);
  const entries = Object.entries(records),
    p = selected ? records[selected] : null;
  return (
    <section className="card project-shelf">
      <div className="card-head">
        <h2>On your desk</h2>
        <button
          onClick={() => {
            const id = crypto.randomUUID();
            if (write(id, { title: "New project", note: "" })) setSelected(id);
          }}
        >
          Add project
        </button>
      </div>
      <div className="card-body">
        <div className="project-tiles">
          {entries.map(([id, p]) => (
            <button
              key={id}
              aria-pressed={selected === id}
              onClick={() => setSelected(selected === id ? null : id)}
            >
              <span className="project-symbol">◌</span>
              <strong>{p.title}</strong>
              <span className="sub">
                {p.next || p.note.split("\n")[0]}
              </span>
            </button>
          ))}
        </div>
        {!entries.length && (
          <p className="sub">
            Add a project to keep its notes and next step here.
          </p>
        )}
        {p && selected && (
          <div className="project-editor">
            <label className="desk-field">
              Project name
              <input
                value={p.title}
                onChange={(e) =>
                  write(selected, { ...p, title: e.target.value })
                }
              />
            </label>
            <label className="desk-field">
              Next step
              <input value={p.next || ''} maxLength={240} placeholder="Next step" onChange={e => write(selected, {...p,next:e.target.value})} />
            </label>
            <label className="desk-field">
              Project notes
              <textarea
                value={p.note}
                onChange={(e) =>
                  write(selected, { ...p, note: e.target.value })
                }
              />
            </label>
            <button
              onClick={() => {
                if (write(selected, null)) {
                  setRemoved({id:selected,project:p});
                  setSelected(null);
                }
              }}
            >
              Remove project
            </button>
          </div>
        )}
        {removed && <p role="status" className="sub">{removed.project.title} removed. <button onClick={() => {if(write(removed.id,removed.project)){setSelected(removed.id);setRemoved(null);}}}>Undo removal</button></p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
