"use client";
import { useEffect, useRef, useState } from "react";
import { usePersonalRecords } from "@/lib/use-personal-records";
import { patchExistingRecord } from "@/lib/personal-records";
import RecordTrash from "./RecordTrash";
import { useProjectDrafts } from "@/lib/use-project-drafts";
import GitHubProjectActivity from "./GitHubProjectActivity";
import GitHubProjectPicker from "./GitHubProjectPicker";
import { projectTaskId, type Project } from "@/lib/github-projects";
import type { State } from "@/lib/db";
import type { FocusTarget } from "@/lib/focus-session";
export default function ProjectShelf({
  tasks = [],
  onTask,
  onFocus,
}: {
  tasks?: State["todos"];
  onTask?: (id: string, title: string) => Promise<boolean>;
  onFocus?: (target: FocusTarget) => void;
}) {
  const { records, trash, restore, write, update, error } =
      usePersonalRecords<Project>("daymark:projects"),
    [selected, setSelected] = useState<string | null>(null),
    [removed, setRemoved] = useState<{ id: string; project: Project } | null>(
      null,
    );
  const {
    drafts,
    setDrafts,
    error: recoveryError,
    loaded: draftsLoaded,
  } = useProjectDrafts();
  const recovered = useRef(false);
  useEffect(() => {
    if (draftsLoaded && !recovered.current) {
      recovered.current = true;
      const id = Object.keys(drafts)[0];
      if (id) setSelected(id);
    }
  }, [draftsLoaded, drafts]);
  const [draftError, setDraftError] = useState("");
  const pending = Object.keys(drafts).length > 0;
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  function edit(id: string, field: "title" | "next" | "note", value: string) {
    setDrafts((old) => ({ ...old, [id]: { ...old[id], [field]: value } }));
    if (
      update(id, (current) => patchExistingRecord(current, { [field]: value }))
    )
      setDrafts((old) => {
        const next = { ...old };
        const remaining = { ...next[id] };
        delete remaining[field];
        if (Object.keys(remaining).length) next[id] = remaining;
        else delete next[id];
        return next;
      });
  }
  function select(id: string | null) {
    if (pending) {
      setDraftError("Save your project edits before switching. Retry below.");
      return;
    }
    setSelected(id);
    setDraftError("");
  }
  function retry() {
    setDraftError("");
    for (const [id, fields] of Object.entries(drafts))
      if (update(id, (current) => patchExistingRecord(current, fields)))
        setDrafts((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
  }
  const [taskBusy, setTaskBusy] = useState(false);
  const history = usePersonalRecords<{
    minutes: number;
    kind: string;
    target?: FocusTarget;
  }>("daymark:focus-history");
  const entries = Object.entries(records),
    p = selected ? records[selected] : null;
  return (
    <section className="card project-shelf">
      <div className="card-head">
        <h2>On your desk</h2>
        <button
          disabled={pending || !draftsLoaded}
          onClick={() => {
            const id = crypto.randomUUID();
            if (write(id, { title: "New project", note: "" })) setSelected(id);
          }}
        >
          Add project
        </button>
      </div>
      <div className="card-body">
        <GitHubProjectPicker
          existing={entries.flatMap(([, project]) =>
            project.repository
              ? [project.repository.fullName.toLowerCase()]
              : [],
          )}
          onAdd={(repo) => {
            if (pending) {
              setDraftError(
                "Save your edits before adding or switching projects.",
              );
              return false;
            }
            const found = entries.find(
              ([, project]) =>
                project.repository?.fullName.toLowerCase() ===
                repo.fullName.toLowerCase(),
            );
            if (found) {
              setSelected(found[0]);
              return true;
            }
            const removedRepo = Object.entries(trash).find(
              ([, project]) =>
                project.repository?.fullName.toLowerCase() ===
                repo.fullName.toLowerCase(),
            );
            if (removedRepo) {
              if (restore(removedRepo[0])) {
                setSelected(removedRepo[0]);
                setRemoved(null);
                return true;
              }
              return false;
            }
            const id = crypto.randomUUID();
            if (
              write(id, {
                title: repo.fullName.split("/")[1],
                note: "",
                repository: repo,
              })
            ) {
              setSelected(id);
              return true;
            }
            return false;
          }}
        />
        <div className="project-tiles">
          {entries.map(([id, p]) => (
            <button
              key={id}
              aria-pressed={selected === id}
              onClick={() => select(selected === id ? null : id)}
            >
              <span className="project-symbol">◌</span>
              <strong>{p.title}</strong>
              <span className="sub">
                {p.next ||
                  (p.repository
                    ? `${p.repository.language || "GitHub"} · ${p.repository.openItems} open ${p.repository.openItems === 1 ? "item" : "items"}`
                    : p.note.split("\n")[0])}
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
            {p.repository && (
              <div className="project-repository">
                <a href={p.repository.url} target="_blank" rel="noreferrer">
                  {p.repository.fullName} ↗
                </a>
                {p.repository.description && (
                  <p className="sub">{p.repository.description}</p>
                )}
                <p className="sub">
                  {p.repository.language || "Repository"}
                  {p.repository.updatedAt
                    ? ` · updated ${new Date(p.repository.updatedAt).toLocaleDateString("en-US")}`
                    : ""}
                </p>
                <a
                  href={`${p.repository.url}/issues`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Issues ↗
                </a>{" "}
                ·{" "}
                <a
                  href={`${p.repository.url}/pulls`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pull requests ↗
                </a>
              </div>
            )}
            <label className="desk-field">
              Project name
              <input
                maxLength={160}
                value={drafts[selected]?.title ?? p.title}
                onChange={(e) => edit(selected, "title", e.target.value)}
              />
            </label>
            <label className="desk-field">
              Next step
              <input
                value={drafts[selected]?.next ?? p.next ?? ""}
                maxLength={240}
                placeholder="Next step"
                onChange={(e) => edit(selected, "next", e.target.value)}
              />
            </label>
            <div className="project-work-actions">
              {onTask && p.next?.trim() && (
                <button
                  type="button"
                  disabled={taskBusy || pending}
                  onClick={async () => {
                    setTaskBusy(true);
                    const id = projectTaskId(selected, p.next!);
                    try {
                      if (await onTask(id, `${p.title}: ${p.next}`))
                        update(selected, (current) =>
                          current
                            ? {
                                ...current,
                                taskIds: Array.from(
                                  new Set([...(current.taskIds || []), id]),
                                ),
                              }
                            : null,
                        );
                    } finally {
                      setTaskBusy(false);
                    }
                  }}
                >
                  {taskBusy ? "Saving…" : "Add next step to tasks"}
                </button>
              )}
              {onFocus && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    onFocus({ kind: "project", id: selected, title: p.title })
                  }
                >
                  Focus on this project
                </button>
              )}
            </div>
            {!!p.taskIds?.some((id) =>
              tasks.some((task) => task.id === id),
            ) && (
              <div className="project-linked-tasks">
                <strong>Linked tasks</strong>
                {p.taskIds
                  .map((id) => tasks.find((t) => t.id === id))
                  .filter(Boolean)
                  .map((task) => (
                    <p key={task!.id}>
                      {task!.done ? "✓ " : ""}
                      {task!.title} <span className="sub">· {task!.due}</span>
                    </p>
                  ))}
              </div>
            )}
            {Object.values(history.records).some(
              (entry) =>
                entry.target?.kind === "project" &&
                entry.target.id === selected &&
                entry.kind === "focus",
            ) && (
              <p className="sub">
                {Math.round(
                  Object.values(history.records)
                    .filter(
                      (entry) =>
                        entry.target?.kind === "project" &&
                        entry.target.id === selected &&
                        entry.kind === "focus",
                    )
                    .reduce((sum, entry) => sum + entry.minutes, 0),
                )}{" "}
                focused minutes recorded
              </p>
            )}
            {p.repository && (
              <GitHubProjectActivity
                key={p.repository.fullName}
                repository={p.repository}
                projectId={selected}
                disabled={pending}
                onTask={
                  onTask
                    ? async (id, title) => {
                        if (!(await onTask(id, title))) return false;
                        return update(selected, (current) =>
                          patchExistingRecord(current, {
                            taskIds: Array.from(
                              new Set([...(current?.taskIds || []), id]),
                            ),
                          }),
                        );
                      }
                    : undefined
                }
                onDetails={(repo) =>
                  update(selected, (current) =>
                    patchExistingRecord(current, { repository: repo }),
                  )
                }
              />
            )}
            <details
              className="project-optional-notes"
              open={p.note || drafts[selected]?.note ? true : undefined}
            >
              <summary>Notes · optional</summary>
              <label className="desk-field">
                Project notes
                <textarea
                  value={drafts[selected]?.note ?? p.note}
                  onChange={(e) => edit(selected, "note", e.target.value)}
                />
              </label>
            </details>
            <button
              onClick={() => {
                if (pending) {
                  setDraftError(
                    "Save your edits before removing this project.",
                  );
                  return;
                }
                if (write(selected, null)) {
                  setRemoved({ id: selected, project: p });
                  setSelected(null);
                }
              }}
            >
              Remove project
            </button>
          </div>
        )}
        {Object.entries(drafts)
          .filter(([id]) => !records[id])
          .map(([id, fields]) => (
            <div className="project-editor" key={id}>
              <p role="alert">
                This project was removed elsewhere. Your unsaved edits are kept
                here so you can copy them.
              </p>
              {Object.entries(fields).map(([field, value]) => (
                <label className="desk-field" key={field}>
                  Unsaved project{" "}
                  {field === "next"
                    ? "next step"
                    : field === "note"
                      ? "notes"
                      : "name"}
                  <textarea readOnly value={String(value)} />
                </label>
              ))}
            </div>
          ))}
        {removed && (
          <p role="status" className="sub">
            {removed.project.title} removed.{" "}
            <button
              onClick={() => {
                if (restore(removed.id)) {
                  setSelected(removed.id);
                  setRemoved(null);
                }
              }}
            >
              Undo removal
            </button>
          </p>
        )}
        <RecordTrash
          items={trash}
          title={(project) => project.title}
          onRestore={(id) => {
            if (pending && !drafts[id]) {
              setDraftError(
                "Save your edits before restoring another project.",
              );
              return false;
            }
            if (restore(id)) {
              setSelected(id);
              setRemoved(null);
              return true;
            }
            return false;
          }}
        />
        {pending && !error && !draftError && !recoveryError && (
          <p className="sub" role="status">
            Recovered edits are kept on this device.{" "}
            <button type="button" onClick={retry}>
              Retry saving
            </button>
          </p>
        )}
        {(error || draftError || recoveryError) && (
          <p role="alert">
            {draftError || error || recoveryError}
            {pending && (
              <button type="button" onClick={retry}>
                Retry saving
              </button>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
