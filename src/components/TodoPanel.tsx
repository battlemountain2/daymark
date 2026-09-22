"use client";

import { use, useMemo, useState } from "react";
import type { State } from "@/lib/db";
import { daysBetween, longDate } from "@/lib/localtime";
import type { CanvasResult } from "@/app/page";

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
  mutate: (body: Record<string, unknown>) => void;
};

export default function TodoPanel({ promise, st, busy, nowIso, mutate }: Props) {
  const canvas = use(promise);
  const canvasError = canvas.error;
  const [adding, setAdding] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const now = { iso: nowIso };
  const items = useMemo(() => buildItems(canvas.assignments, st), [canvas.assignments, st]);
  const upcoming = items.filter((i) => daysBetween(now.iso, i.due) >= 0);
  const hiddenCount = upcoming.filter((i) => !i.mine && st.dismissed.includes(i.id)).length;
  const visible = upcoming.filter((i) => showHidden || i.mine || !st.dismissed.includes(i.id));
  const doneCount = items.filter((i) => i.done).length;

  return (
      <section className="card span12">
        <div className="card-head">
          <h2>To do</h2>
          <span className={`pill mono ${canvasError ? "" : "live"}`}>
            {canvasError ? "canvas unavailable" : "live"}
          </span>
        </div>
        <div className="card-body">
          {canvasError && <div className="sub" style={{ marginBottom: 12 }}>{canvasError}</div>}

          {visible.slice(0, 8).map((it) => {
            const d = daysBetween(now.iso, it.due);
            const hidden = !it.mine && st.dismissed.includes(it.id);
            return (
              <div key={it.id} className={`row${it.done ? " done" : ""}`}>
                <div className={`cd mono${d <= 7 && !it.done ? " soon" : ""}`}>
                  {it.done ? "✓" : d}
                  <small>{it.done ? "done" : d === 0 ? "today" : d === 1 ? "day" : "days"}</small>
                </div>
                <div>
                  <input type="checkbox" checked={it.done}
                    aria-label={`Mark ${it.title} done`}
                    onChange={(e) =>
                      mutate(it.mine
                        ? { action: "todoDone", id: it.id, done: e.target.checked }
                        : { action: "tick", key: it.id, done: e.target.checked })} />
                </div>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ flex: 1 }}>
                      <span className={`code mono ${it.mine ? "mine" : it.ck}`}>{it.code}</span>
                      <span className="title">{it.title}</span>
                    </span>
                    <button className="btn quiet mono" style={{ padding: "0 4px" }}
                      title={it.mine ? "Delete this" : hidden ? "Bring this back" : "Dismiss this"}
                      onClick={() =>
                        mutate(it.mine
                          ? { action: "deleteTodo", id: it.id }
                          : { action: "dismiss", key: it.id, hidden: !hidden })}>
                      {hidden ? "↺" : "×"}
                    </button>
                  </div>
                  <div className="sub mono">
                    due {longDate(it.due)}
                    {it.kind === 1 ? " · quiz" : it.kind === 2 ? " · exam" : it.mine ? " · yours" : ""}
                  </div>
                </div>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 12 }}>
              {hiddenCount} dismissed ·{" "}
              <button className="btn quiet mono" style={{ padding: 0, textDecoration: "underline" }}
                onClick={() => setShowHidden((v) => !v)}>
                {showHidden ? "hide again" : "show"}
              </button>
            </div>
          )}

          {!adding ? (
            <button className="addbtn mono" onClick={() => setAdding(true)}>+ add your own</button>
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

          <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 14 }}>
            {doneCount} / {items.length} done · {upcoming.filter((i) => !i.done).length} ahead
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
