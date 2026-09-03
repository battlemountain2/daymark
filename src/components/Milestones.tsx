"use client";

import { use, useEffect, useState } from "react";
import type { Term } from "@/lib/term";
import type { CanvasResult } from "@/app/page";
import type { State } from "@/lib/db";
import { buildItems } from "@/components/TodoPanel";
import { daysBetween, longDate } from "@/lib/localtime";
import { localParts } from "@/lib/schedule";

function milestonesFor(term: Term) {
  const out: Array<{ iso: string; label: string; note?: string }> = [];

  const runs: string[][] = [];
  for (const d of [...term.breaks].sort()) {
    const last = runs[runs.length - 1];
    if (last && daysBetween(last[last.length - 1], d) === 1) last.push(d);
    else runs.push([d]);
  }
  for (const run of runs) {
    const a = longDate(run[0]).replace(/^\w+, /, "");
    const b = longDate(run[run.length - 1]).replace(/^\w+, /, "");
    out.push({
      iso: run[0],
      label: "Break",
      note: run.length === 1 ? a : `${a} – ${b}`,
    });
  }

  out.push({ iso: term.end, label: "Last day", note: longDate(term.end).replace(/^\w+, /, "") });
  return out.sort((x, y) => (x.iso < y.iso ? -1 : 1));
}

export function weekLoad(term: Term, items: Array<{ due: string; done: boolean; kind: 0 | 1 | 2 }>) {
  const total = Math.max(1, daysBetween(term.start, term.end));
  const weeks = Math.ceil(total / 7);
  const buckets = Array.from({ length: weeks }, () => ({ count: 0, weight: 0, exams: 0 }));

  for (const it of items) {
    if (it.done) continue;
    const off = daysBetween(term.start, it.due);
    if (off < 0 || off > total) continue;
    const w = Math.min(weeks - 1, Math.floor(off / 7));
    buckets[w].count++;
    buckets[w].weight += it.kind === 0 ? 1 : 2;
    if (it.kind !== 0) buckets[w].exams++;
  }
  return buckets;
}

const weekStart = (term: Term, w: number): string => {
  const [y, m, d] = term.start.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + w * 7 * 86400000);
  return t.toISOString().slice(0, 10);
};

export default function Milestones({
  term, promise, st,
}: { term: Term; promise: Promise<CanvasResult>; st: State }) {
  const canvas = use(promise);
  const [iso, setIso] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setIso(localParts().iso);
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  if (!iso) {
    return (
      <section className="card span5">
        <div className="card-head"><h2>Semester</h2></div>
        <div className="card-body"><div className="sub">counting…</div></div>
      </section>
    );
  }

  const items = buildItems(canvas.assignments, st);
  const load = weekLoad(term, items);
  const thisWeek = Math.max(0, Math.floor(daysBetween(term.start, iso) / 7));
  const peak = load.reduce((max, b, i) => (b.weight > load[max].weight ? i : max), 0);
  const weeksAhead = load
    .map((b, i) => ({ ...b, i }))
    .filter((b) => b.i >= thisWeek && b.count > 0);
  const worst = weeksAhead.length
    ? weeksAhead.reduce((a, b) => (b.weight > a.weight ? b : a))
    : null;
  const maxWeight = Math.max(1, ...load.map((b) => b.weight));

  const MILESTONES = milestonesFor(term);
  const total = daysBetween(term.start, term.end);
  const gone = Math.max(0, Math.min(total, daysBetween(term.start, iso)));
  const pct = Math.round((gone / total) * 100);

  const ahead = MILESTONES.map((m) => ({ ...m, days: daysBetween(iso, m.iso) }))
    .filter((m) => m.days >= 0);

  // Filter upcoming exams & major deliverables (quizzes, midterms, dossiers)
  const upcomingExams = items
    .filter((it) => !it.done && (it.kind !== 0 || /exam|midterm|quiz|dossier|brief|paper/i.test(it.title)))
    .map((it) => ({ ...it, days: daysBetween(iso, it.due) }))
    .filter((it) => it.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  return (
    <section className="card span5">
      <div className="card-head">
        <h2>Semester</h2>
        <span className="pill mono">{pct}% through</span>
      </div>
      <div className="card-body">
        <div className="termbar" role="img"
          aria-label={`${pct} percent through the semester, day ${gone} of ${total}`}>
          <div className="termfill" style={{ width: `${pct}%` }} />
          {MILESTONES.map((m) => {
            const at = (daysBetween(term.start, m.iso) / total) * 100;
            return <div className="termtick" key={m.iso} style={{ left: `${at}%` }} />;
          })}
        </div>
        <div className="sub mono termends">
          <span>{longDate(term.start).replace(/^\w+, /, "")}</span>
          <span>day {gone} of {total}</span>
          <span>{longDate(term.end).replace(/^\w+, /, "")}</span>
        </div>

        {items.length > 0 && (
          <div className="radar">
            <div className="minihead mono">Where the work lands</div>
            <div className="radarbars" role="img"
              aria-label={`Assignment load by week; heaviest week has ${load[peak].count} items`}>
              {load.map((b, i) => (
                <div
                  key={i}
                  className={`rbar${i === thisWeek ? " now" : ""}${
                    worst && i === worst.i && b.weight > 0 ? " worst" : ""
                  }${i < thisWeek ? " past" : ""}`}
                  style={{ height: `${Math.max(b.weight ? 8 : 2, (b.weight / maxWeight) * 100)}%` }}
                  title={`Week of ${longDate(weekStart(term, i))}: ${b.count} due${
                    b.exams ? `, ${b.exams} quiz/exam` : ""
                  }`}
                />
              ))}
            </div>
            <div className="sub radarnote">
              {worst && worst.count >= 3 ? (
                <>
                  Heaviest ahead: <b>week of {longDate(weekStart(term, worst.i)).replace(/^\w+, /, "")}</b>
                  {" — "}{worst.count} due{worst.exams ? `, ${worst.exams} of them graded` : ""}.
                  {worst.i > thisWeek + 1 && " Worth starting early."}
                </>
              ) : worst ? (
                <>Nothing stacked up ahead — heaviest week has {worst.count}.</>
              ) : (
                <>Nothing left on the calendar.</>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Major Exams / Deliverables Radar */}
        {upcomingExams.length > 0 && (
          <div className="exam-countdown-radar mono">
            <div className="ecr-head">⏳ Upcoming Major Assessments</div>
            <div className="ecr-list">
              {upcomingExams.map((ex) => (
                <div key={ex.id} className="ecr-item">
                  <div className="ecr-info">
                    <span className="ecr-code">{ex.code}</span>
                    <span className="ecr-title">{ex.title}</span>
                  </div>
                  <div className="ecr-countdown">
                    <span className="ecr-badge">
                      {ex.days === 0 ? "Due Today" : ex.days === 1 ? "Tomorrow" : `${ex.days}d left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="miles">
          {ahead.map((m) => (
            <div className="mile" key={m.iso}>
              <div className="mile-n mono">
                {m.days === 0 ? "today" : m.days}
                {m.days > 0 && <small>{m.days === 1 ? "day" : "days"}</small>}
              </div>
              <div>
                <div className="mile-l">{m.label}</div>
                {m.note && <div className="sub mono">{m.note}</div>}
              </div>
            </div>
          ))}
          {!ahead.length && <div className="sub">Term&apos;s over. Go outside.</div>}
        </div>
      </div>
    </section>
  );
}

export function MilestonesSkeleton() {
  return (
    <section className="card span5">
      <div className="card-head"><h2>Semester</h2><span className="pill mono">loading</span></div>
      <div className="card-body">
        <div className="termbar" />
        <div className="miles">
          {[0, 1, 2].map((i) => (
            <div className="mile" key={i}>
              <div className="mile-n mono"><span className="bar" style={{ width: 34 }} /></div>
              <div><span className="bar" style={{ width: `${52 - i * 8}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
