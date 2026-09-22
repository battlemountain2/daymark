"use client";

import React from "react";
import type { Term } from "@/lib/term";
import type { ClassBlock } from "@/lib/schedule";
import { getPreClassBrief, type PreClassBrief } from "@/lib/pre-class-briefs";

interface WeeklyTimetableProps {
  term: Term;
  now: { iso: string; dow: number; minutes: number };
  onSelectBrief?: (brief: PreClassBrief) => void;
  onStartFocus?: (gapMinutes: number) => void;
}

const DAYS = [
  { dow: 1, short: "Mon", full: "Monday" },
  { dow: 2, short: "Tue", full: "Tuesday" },
  { dow: 3, short: "Wed", full: "Wednesday" },
  { dow: 4, short: "Thu", full: "Thursday" },
  { dow: 5, short: "Fri", full: "Friday" },
];

function hhmm(timeStr: string): number {
  const [h, m] = timeStr.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function fmtTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 || 12;
  const ampm = h24 < 12 ? "am" : "pm";
  return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}

export default function WeeklyTimetable({
  term,
  now,
  onSelectBrief,
  onStartFocus,
}: WeeklyTimetableProps) {
  // Check if today is a weekday
  const currentDow = now.dow;

  // Retrieve any online / Saturday courses
  const onlineCourses: ClassBlock[] = (term.schedule[6] || []).concat(
    term.schedule[0] || []
  );

  return (
    <div className="weekly-timetable-root">
      {/* Scrollable grid container for small viewports */}
      <div className="weekly-grid-container">
        <div className="weekly-grid">
          {DAYS.map((day) => {
            const isToday = day.dow === currentDow;
            const dayClasses: ClassBlock[] = term.schedule[day.dow] || [];

            return (
              <div
                key={day.dow}
                className={`weekly-col ${isToday ? "weekly-col-today" : ""}`}
              >
                {/* Column Day Header */}
                <div className="weekly-col-header">
                  <div className="weekly-col-day mono">
                    <span className="weekly-day-short">{day.short}</span>
                    <span className="weekly-day-full">{day.full}</span>
                  </div>
                  {isToday ? (
                    <span className="weekly-today-pill mono">Today</span>
                  ) : (
                    <span className="weekly-class-count mono">
                      {dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"}
                    </span>
                  )}
                </div>

                {/* Day Classes & Gaps */}
                <div className="weekly-col-body">
                  {day.dow === 5 && dayClasses.length > 0 && hhmm(dayClasses[0].start) >= 720 && (
                    <div className="weekly-open-morning mono">
                      <span>☀️ Morning Open</span>
                      <small>Deep study &amp; recovery</small>
                    </div>
                  )}
                  {dayClasses.length === 0 ? (
                    <div className="weekly-empty-day mono">
                      <span>No in-person classes</span>
                      <small>Open study &amp; gym day</small>
                    </div>
                  ) : (
                    dayClasses.map((c, idx) => {
                      const startMin = hhmm(c.start);
                      const endMin = hhmm(c.end);
                      const isNowClass =
                        isToday && now.minutes >= startMin && now.minutes < endMin;
                      const isPastClass = isToday && now.minutes >= endMin;
                      const brief = getPreClassBrief(c.code);

                      // Calculate gap before this class
                      let gapBefore: { minutes: number; from: string; to: string } | null = null;
                      if (idx > 0) {
                        const prevEnd = hhmm(dayClasses[idx - 1].end);
                        const diff = startMin - prevEnd;
                        if (diff >= 30) {
                          gapBefore = {
                            minutes: diff,
                            from: dayClasses[idx - 1].end,
                            to: c.start,
                          };
                        }
                      }

                      return (
                        <React.Fragment key={`${day.dow}-${c.code}-${idx}`}>
                          {gapBefore && (
                            <div className="weekly-gap-slot mono">
                              <span className="weekly-gap-line" />
                              <div className="weekly-gap-info">
                                <span>
                                  {Math.floor(gapBefore.minutes / 60) > 0
                                    ? `${Math.floor(gapBefore.minutes / 60)}h `
                                    : ""}
                                  {gapBefore.minutes % 60 > 0 ? `${gapBefore.minutes % 60}m ` : ""}gap
                                </span>
                                {onStartFocus && (
                                  <button
                                    type="button"
                                    className="weekly-gap-focus-btn"
                                    onClick={() => onStartFocus(gapBefore!.minutes)}
                                    title="Start focus timer for this gap"
                                  >
                                    ⏱ focus
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div
                            className={`weekly-card ${c.ck} ${isNowClass ? "active-now" : ""} ${isPastClass ? "is-past" : ""}`}
                          >
                            <div className="weekly-card-stripe" />
                            <div className="weekly-card-content">
                              <div className="weekly-card-top">
                                <span className="weekly-card-time mono">
                                  {fmtTime(startMin)} – {fmtTime(endMin)}
                                </span>
                                <span className={`weekly-card-code mono badge-${c.ck}`}>
                                  {c.code}
                                </span>
                              </div>

                              <div className="weekly-card-title">{c.title}</div>
                              <div className="weekly-card-where">{c.where}</div>

                              {brief && onSelectBrief && (
                                <div className="weekly-card-actions">
                                  <button
                                    type="button"
                                    className="weekly-brief-btn mono"
                                    onClick={() => onSelectBrief(brief)}
                                    title={`View 1-min brief for ${c.code}`}
                                  >
                                    ⚡ 1-Min Brief
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Online / Async Classes strip */}
      {onlineCourses.length > 0 && (
        <div className="weekly-online-strip mono">
          <span className="weekly-online-tag">Online Coursework:</span>
          {onlineCourses.map((oc, i) => (
            <span key={i} className="weekly-online-item">
              <strong>{oc.code}</strong> {oc.title} ({oc.where} · {oc.start}–{oc.end})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
