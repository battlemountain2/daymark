"use client";

import { Fragment, use, useMemo, useState } from "react";
import type { State } from "@/lib/db";
import { daysBetween, longDate } from "@/lib/localtime";
import type { CanvasResult } from "@/app/page";
import {usePersonalRecords} from "@/lib/use-personal-records";
import {READING_LINKS_KEY,readingsForAssignment,readingUrl,type ReadingLink} from "@/lib/reading-links";
import {capturedTaskSource} from '@/lib/note-links';

/**
 * The to-do panel, suspended on its own.
 *
 * Canvas is a ~400ms fetch. Everything else on this page — the clock, the class
 * schedule, the sun — needs no network at all, so making them wait on it was
 * pure loss. This component is the only thing that blocks on Canvas.
 */

export type Item = {
  id: string; due: string; code: string; ck: string;
  title: string; kind: 0 | 1 | 2; mine: boolean; done: boolean; locked: boolean;
};

/** Canvas assignments plus his own to-dos, merged and sorted by due date. */
export function buildItems(assignments: CanvasResult["assignments"], st: State): Item[] {
  const fromCanvas: Item[] = assignments.map((a) => ({
    id: a.id, due: a.due, code: a.code, ck: a.ck, title: a.title, kind: a.kind,
    mine: false, done: !!st.ticks[a.id], locked: false,
  }));
  const mine: Item[] = st.todos.map((t) => ({
    id: t.id, due: t.due, code: "mine", ck: "adm", title: t.title, kind: 0,
    mine: true, done: t.done, locked: false,
  }));
  return [...fromCanvas, ...mine].sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
}

type Props = {
  promise: Promise<CanvasResult>;
  st: State;
  busy: boolean;
  nowIso: string;
  onRead?: (file:string)=>void;
  mutate: (body: Record<string, unknown>) => void;
};

export type EnergyTier = "all" | "deep" | "medium" | "low";

export function getEnergyTier(title: string, kind: number, mine: boolean): "deep" | "medium" | "low" {
  const t = title.toLowerCase();
  if (kind === 2 || /\b(lab|essay|paper|project|code|midterm|exam|report|synthesis|analysis|program)\b/i.test(t)) {
    return "deep";
  }
  if (kind === 1 || /\b(quiz|read|chapter|ch\.|review|discussion|film|brief|article|module)\b/i.test(t)) {
    return "medium";
  }
  return "low";
}

export function getCircadianWindow(): { label: string; icon: string; advice: string; bestTier: "deep" | "medium" | "low" } {
  // Albuquerque local time
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", hour12: false }).formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "12", 10);

  if (hour >= 6 && hour < 12) {
    return {
      label: "Morning",
      icon: "☀️",
      advice: "Try a lab, essay, or project.",
      bestTier: "deep"
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      label: "Afternoon",
      icon: "⛅",
      advice: "Try a reading, quiz, or review.",
      bestTier: "medium"
    };
  }
  return {
    label: "Evening",
    icon: "🌙",
    advice: "Try an upload or checklist task.",
    bestTier: "low"
  };
}

export default function TodoPanel({ promise, st, busy, nowIso, mutate, onRead }: Props) {
  const readingLinks=usePersonalRecords<ReadingLink>(READING_LINKS_KEY);
  const canvas = use(promise);
  const canvasError = canvas.error;
  const [adding, setAdding] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [taskView, setTaskView] = useState<"open" | "overdue" | "completed">("open");
  const [limit, setLimit] = useState(10);
  const [activeEnergyTier, setActiveEnergyTier] = useState<EnergyTier>("all");

  const now = { iso: nowIso };
  const items = useMemo(() => buildItems(canvas.assignments, st), [canvas.assignments, st]);
  const hiddenCount = items.filter((i) => !i.mine && st.dismissed.includes(i.id)).length;
  const overdue = items.filter(i => !i.done && daysBetween(now.iso, i.due) < 0 && !st.dismissed.includes(i.id));
  const visible = items.filter(i => (showHidden || i.mine || !st.dismissed.includes(i.id)) && (taskView === "completed" ? i.done : taskView === "overdue" ? !i.done && daysBetween(now.iso, i.due) < 0 : !i.done));
  const doneCount = items.filter((i) => i.done).length;


  const tierCounts = useMemo(() => {
    const counts = { all: visible.length, deep: 0, medium: 0, low: 0 };
    visible.forEach(it => {
      const tier = getEnergyTier(it.title, it.kind, it.mine);
      counts[tier]++;
    });
    return counts;
  }, [visible]);

  const filteredItems = useMemo(() => {
    if (activeEnergyTier === "all") return visible;
    return visible.filter(it => getEnergyTier(it.title, it.kind, it.mine) === activeEnergyTier);
  }, [visible, activeEnergyTier]);

  return (
      <section className="card span12 task-panel">
        <div className="card-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2>To do</h2>
            <span className="mono sub" style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {doneCount}/{items.length} done
            </span>
          </div>
          <span className={`pill mono ${canvasError ? "" : "live"}`}>
            {canvasError ? "canvas unavailable" : "live"}
          </span>
        </div>

        {/* Cognitive Energy Filter Tabs */}
        <div className="newstabs task-status-tabs" aria-label="Assignment status">
          {(["open", "overdue", "completed"] as const).map(view => <button key={view} className={taskView === view ? "on" : ""} aria-pressed={taskView === view} onClick={() => { setTaskView(view); setLimit(10); setActiveEnergyTier("all"); }}>{view === "open" ? "All open" : view === "overdue" ? `Overdue (${overdue.length})` : `Completed (${doneCount})`}</button>)}
        </div>
        <details className="personal-setup task-suggestions"><summary>More filters</summary>
          <label>Task type <select value={activeEnergyTier} onChange={e=>{setActiveEnergyTier(e.target.value as EnergyTier);setLimit(10);}}>
            <option value="all">All tasks ({tierCounts.all})</option><option value="deep">Projects and exams ({tierCounts.deep})</option><option value="medium">Readings and reviews ({tierCounts.medium})</option><option value="low">Other tasks ({tierCounts.low})</option>
          </select></label>
          {hiddenCount>0&&<label><input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/> Include {hiddenCount} dismissed assignments</label>}
        </details>

        <div className="card-body">
          {canvasError && <div className="sub" style={{ marginBottom: 12 }}>{"Assignments are unavailable right now. Your saved tasks still work."}</div>}

          {filteredItems.length === 0 && (
            <div className="mono sub" style={{ padding: "20px 0", textAlign: "center", color: "var(--ink-3)" }}>
              {activeEnergyTier !== "all" ? "No tasks match this filter." : taskView === "completed" ? "No completed tasks yet." : taskView === "overdue" ? "Nothing overdue." : canvasError ? "Assignments unavailable. You can still add your own tasks." : "You’re caught up."}
            </div>
          )}

          {filteredItems.slice(0, limit).map((it, index) => {
            const source = it.mine ? capturedTaskSource(it.title) : {title:it.title,url:null};
            const d = daysBetween(now.iso, it.due);
            const hidden = !it.mine && st.dismissed.includes(it.id);
            const group = it.done ? "Completed" : d < 0 ? "Overdue" : d === 0 ? "Today" : d === 1 ? "Tomorrow" : d <= 7 ? "Next 7 days" : "Later";
            const previous = filteredItems[index-1];
            const prevDays = previous ? daysBetween(now.iso, previous.due) : null;
            const previousGroup = previous ? previous.done ? "Completed" : prevDays! < 0 ? "Overdue" : prevDays === 0 ? "Today" : prevDays === 1 ? "Tomorrow" : prevDays! <= 7 ? "Next 7 days" : "Later" : null;
            return (
              <Fragment key={it.id}>
              {group !== previousGroup && <h3 className="task-date-group">{group}</h3>}
              <div className={`row${it.done ? " done" : ""}`}>
                <div>
                  <input type="checkbox" id={`chk-${it.id}`} checked={it.done}
                    aria-label={`Mark ${it.title} ${it.done ? "incomplete" : "done"}`}
                    onChange={(e) =>
                      mutate(it.mine
                        ? { action: "todoDone", id: it.id, done: e.target.checked }
                        : { action: "tick", key: it.id, done: e.target.checked })} />
                </div>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <label className="task-title-label" htmlFor={`chk-${it.id}`} style={{ flex: 1, cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }}>
                      <span className={`code mono ${it.mine ? "mine" : it.ck}`}>{it.code}</span>
                      <span className="title">{source.title}</span>
                    </label>
                    <button className="btn quiet mono" style={{ padding: "0 4px" }}
                      aria-label={it.mine ? `Delete ${source.title}` : hidden ? `Restore ${source.title}` : `Dismiss ${source.title}`}
                      title={it.mine ? "Delete this" : hidden ? "Bring this back" : "Dismiss this"}
                      onClick={() =>
                        mutate(it.mine
                          ? { action: "deleteTodo", id: it.id }
                          : { action: "dismiss", key: it.id, hidden: !hidden })}>
                      {hidden ? "↺" : "×"}
                    </button>
                  </div>
                  <div className="sub task-meta" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {readingsForAssignment(readingLinks.records,it.id).map((r,i)=><a key={`${r.file}:${i}`} href={readingUrl(r.file)} onClick={e=>{if(onRead){e.preventDefault();onRead(r.file);}}}>Read {r.title}</a>)}
                    {source.url && <a href={source.url} target="_blank" rel="noreferrer">Open source ↗</a>}
                    {!it.mine&&<><a href={`/notebook?course=${encodeURIComponent(it.code)}`}>Course notes ↗</a><a href={`/study?course=${encodeURIComponent(it.code)}`}>Review cards ↗</a></>}
                    <span>due {longDate(it.due)}</span>
                    <span>{it.kind === 1 ? " · quiz" : it.kind === 2 ? " · exam" : it.mine ? " · yours" : ""}</span>

                  </div>
                </div>
              </div>
              </Fragment>
            );
          })}

          {!adding ? (
            <button className="addbtn" onClick={() => setAdding(true)}>+ add your own</button>
          ) : (
            <form className="addform" onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget as HTMLFormElement;
              const title = (f.elements.namedItem("t") as HTMLInputElement).value.trim();
              const due = (f.elements.namedItem("d") as HTMLInputElement).value;
              if (!title || !due) return;
              mutate({ action: "addTodo", title, due });
              setAdding(false);
            }}>
              <input name="t" placeholder="What do you need to do?" maxLength={90} required autoFocus />
              <div className="addrow">
                <input name="d" type="date" required defaultValue={now.iso}
                  className="mono" style={{ flex: 1, minWidth: 130, fontSize: 12.5 }} />
                <button className="btn mono" type="submit">Add</button>
                <button className="btn quiet mono" type="button" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="mono" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 14 }}>
            {filteredItems.length > limit && <button className="btn mono" onClick={() => setLimit(v => v + 10)}>Show more assignments</button>}
            <details className="personal-setup"><summary>About completion</summary><p>Completed tasks can be unchecked to undo. This updates Daymark; submit coursework in Canvas.</p></details>
          </div>
        </div>
      </section>
  );
}

/** Shown while Canvas is still in flight. Same shape, so nothing jumps. */
export function TodoSkeleton() {
  return (
    <section className="card span12">
      <div className="card-head">
        <h2>To do</h2>
        <span className="pill mono">loading</span>
      </div>
      <div className="card-body">
        {[0, 1, 2, 3].map((i) => (
          <div className="row skel" key={i}>
            <div className="cd mono"><span className="bar" style={{ width: 22 }} /></div>
            <div><span className="bar" style={{ width: 16, height: 16 }} /></div>
            <div>
              <span className="bar" style={{ width: `${58 - i * 7}%` }} />
              <span className="bar sm" style={{ width: `${34 - i * 3}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
