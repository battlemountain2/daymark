"use client";

import type { Term } from "@/lib/term";
import { hhmm } from "@/lib/schedule";
import { getPreClassBrief, type PreClassBrief } from "@/lib/pre-class-briefs";

interface Props {
  term: Term;
  now: { iso: string; dow: number; minutes: number };
  onSelectBrief?: (brief: PreClassBrief) => void;
  onStartFocus?: (gapMinutes: number) => void;
}
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
function time(value: string) {
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}
export default function WeeklyTimetable({ term, now, onSelectBrief, onStartFocus }: Props) {
  const inTerm = now.iso >= term.start && now.iso <= term.end && !term.breaks.includes(now.iso);
  const today = inTerm ? [...(term.schedule[now.dow] || [])].sort((a,b) => hhmm(a.start) - hhmm(b.start)) : [];
  const next = today.findIndex(c => hhmm(c.start) > now.minutes);
  const previous = next > 0 ? today[next - 1] : null;
  const freeMinutes = previous && now.minutes >= hhmm(previous.end) ? hhmm(today[next].start) - now.minutes : 0;
  const weekend = [6, 0].flatMap(dow => (term.schedule[dow] || []).map(c => ({ ...c, dow })));
  return <div className="week-agenda">
    <p className="sub">Your recurring class week · expand a class for details.</p>
    {freeMinutes >= 30 && onStartFocus && <div className="week-free">
      <span>{Math.floor(freeMinutes / 60) ? `${Math.floor(freeMinutes / 60)}h ` : ""}{freeMinutes % 60}m until your next class</span>
      <button type="button" className="btn" onClick={() => onStartFocus(freeMinutes)}>Start focus</button>
    </div>}
    {DAYS.map((day, index) => {
      const dow = index + 1;
      const classes = [...(term.schedule[dow] || [])].sort((a,b) => hhmm(a.start) - hhmm(b.start));
      const isToday = dow === now.dow;
      return <section className={`week-day${isToday ? " is-today" : ""}`} key={day} aria-label={day}>
        <div className="week-day-label"><h3>{day}</h3>{isToday && <span className="pill mono">Today</span>}</div>
        <div className="week-classes">
          {!classes.length && <p className="sub">No scheduled classes</p>}
          {classes.map((c, i) => {
            const brief = getPreClassBrief(c.code);
            const active = inTerm && isToday && now.minutes >= hhmm(c.start) && now.minutes < hhmm(c.end);
            return <details className={`week-class ${c.ck}${active ? " active-now" : ""}`} key={`${c.code}-${i}`}>
              <summary><span className="week-time mono">{time(c.start)}–{time(c.end)}</span><span className="week-title">{c.title}{active && <small> · In class now</small>}</span><span className="week-expand" aria-hidden="true">+</span></summary>
              <div className="week-details"><p><strong>{c.code}</strong> · {c.where}</p>{brief && onSelectBrief && <button type="button" className="btn" onClick={() => onSelectBrief(brief)}>Open class brief</button>}</div>
            </details>;
          })}
        </div>
      </section>;
    })}
    {weekend.length > 0 && <details className="week-other"><summary>Weekend &amp; online coursework</summary>{weekend.map((c,i) => <p key={i}><strong>{c.code}</strong> · {c.title}<br /><span className="sub">{c.dow === 6 ? "Saturday" : "Sunday"} · {time(c.start)}–{time(c.end)} · {c.where}</span></p>)}</details>}
  </div>;
}
