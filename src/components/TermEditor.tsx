"use client";

import { useState } from "react";
import Link from "next/link";
import type { Term } from "@/lib/term";
import { COLOUR_KEYS } from "@/lib/term";
import type { ClassBlock } from "@/lib/schedule";

/**
 * Editing the term, so next semester doesn't need a developer.
 *
 * The whole state is held locally and saved in one go rather than
 * autosaving per keystroke: a schedule is edited in bursts — you sit down with
 * a timetable and type the whole thing — and a half-entered course row being
 * persisted mid-typing would mean the dashboard briefly showing a class at
 * 1:0 in "Mitch".
 */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const blank = (): ClassBlock => ({
  start: "09:00", end: "09:50", code: "", title: "", where: "", ck: "adm",
});

export default function TermEditor({ initial }: { initial: Term }) {
  const [term, setTerm] = useState<Term>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [breakDate, setBreakDate] = useState("");

  const setDay = (d: number, rows: ClassBlock[]) =>
    setTerm((t) => ({ ...t, schedule: { ...t.schedule, [d]: rows } }));

  const editRow = (d: number, i: number, patch: Partial<ClassBlock>) =>
    setDay(d, (term.schedule[d] ?? []).map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/term", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(term),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(json?.error ?? `Save failed (${res.status}).`);
        return;
      }
      // The server returns the parsed term, which may have dropped incomplete
      // rows. Showing that back is honest about what was actually stored.
      if (json?.term) setTerm(json.term);
      setMsg("Saved.");
    } catch {
      setMsg("Couldn't reach the server. Nothing was saved.");
    } finally {
      setSaving(false);
    }
  }

  const count = Object.values(term.schedule).reduce((n, r) => n + r.length, 0);

  return (
    <div className="wrap">
      <header>
        <h1 className="greet">Your <em>term</em></h1>
        <div className="status">
          {count} class{count === 1 ? "" : "es"} a week · {term.breaks.length} day
          {term.breaks.length === 1 ? "" : "s"} off
        </div>
        <div className="stamp mono">
          <Link href="/" className="morelink mono">← dashboard</Link>
        </div>
      </header>
      <div className="rule" />

      <div className="grid">
        <section className="card span5">
          <div className="card-head"><h2>Dates</h2></div>
          <div className="card-body">
            <label className="field">
              <span className="mono">Name</span>
              <input value={term.name} maxLength={40} placeholder="Spring 2027"
                onChange={(e) => setTerm({ ...term, name: e.target.value })} />
            </label>
            <label className="field">
              <span className="mono">First day</span>
              <input type="date" value={term.start}
                onChange={(e) => setTerm({ ...term, start: e.target.value })} />
            </label>
            <label className="field">
              <span className="mono">Last day</span>
              <input type="date" value={term.end}
                onChange={(e) => setTerm({ ...term, end: e.target.value })} />
            </label>

            <div className="minihead mono" style={{ marginTop: 20 }}>Days off</div>
            <div className="sub" style={{ marginBottom: 8 }}>
              Breaks and holidays. No classes show on these days, and the
              countdowns skip them.
            </div>
            {term.breaks.map((b) => (
              <div className="breakrow" key={b}>
                <span className="mono">{b}</span>
                <button className="btn quiet mono"
                  onClick={() => setTerm({ ...term, breaks: term.breaks.filter((x) => x !== b) })}>
                  ×
                </button>
              </div>
            ))}
            <div className="addrow">
              <input type="date" value={breakDate} className="mono"
                onChange={(e) => setBreakDate(e.target.value)} />
              <button className="btn mono" disabled={!breakDate}
                onClick={() => {
                  if (!breakDate || term.breaks.includes(breakDate)) return;
                  setTerm({ ...term, breaks: [...term.breaks, breakDate].sort() });
                  setBreakDate("");
                }}>
                Add
              </button>
            </div>
          </div>
        </section>

        <section className="card span7">
          <div className="card-head">
            <h2>Classes</h2>
            <span className="pill mono">{count} a week</span>
          </div>
          <div className="card-body">
            {DAYS.map((name, d) => {
              const rows = term.schedule[d] ?? [];
              return (
                <div className="dayblock" key={d}>
                  <div className="dayhead">
                    <span className="mono">{name}</span>
                    <button className="btn quiet mono"
                      onClick={() => setDay(d, [...rows, blank()])}>+ add</button>
                  </div>
                  {!rows.length && <div className="sub dayempty">Nothing scheduled.</div>}
                  {rows.map((r, i) => (
                    <div className="classrow" key={i}>
                      <input className="mono ci-time" type="time" value={r.start}
                        onChange={(e) => editRow(d, i, { start: e.target.value })} />
                      <input className="mono ci-time" type="time" value={r.end}
                        onChange={(e) => editRow(d, i, { end: e.target.value })} />
                      <input className="mono ci-code" value={r.code} placeholder="GEOG 1150"
                        maxLength={20} onChange={(e) => editRow(d, i, { code: e.target.value })} />
                      <input className="ci-title" value={r.title} placeholder="Course name"
                        maxLength={80} onChange={(e) => editRow(d, i, { title: e.target.value })} />
                      <input className="ci-where" value={r.where} placeholder="Building and room"
                        maxLength={60} onChange={(e) => editRow(d, i, { where: e.target.value })} />
                      <select className="mono ci-ck" value={r.ck}
                        onChange={(e) => editRow(d, i, { ck: e.target.value as ClassBlock["ck"] })}>
                        {COLOUR_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <button className="btn quiet mono ci-x" title="Remove"
                        onClick={() => setDay(d, rows.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="sub" style={{ marginTop: 14, fontSize: 12 }}>
              The building name matters: a tight gap between two different
              buildings is what triggers the leave-early nudge. Room numbers are
              stripped automatically, so &ldquo;Mitchell Hall 101&rdquo; and
              &ldquo;Mitchell Hall 120&rdquo; count as the same place.
            </div>
          </div>
        </section>
      </div>

      <div className="saverow">
        <button className="btn mono" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save term"}
        </button>
        {msg && <span className={`sub ${msg === "Saved." ? "ok" : "bad"}`}>{msg}</span>}
      </div>
    </div>
  );
}
