"use client";
import { useState } from "react";
import { longDate } from "@/lib/localtime";
import type { WorkoutSession, WeightUnit } from "@/lib/workout-sessions";
import {
  progressTracks,
  progressPoints,
  progressLabel,
  progressUnit,
  workoutWeek,
} from "@/lib/workout-progress";

export default function WorkoutProgress({
  sessions,
  unit,
}: {
  sessions: WorkoutSession[];
  unit: WeightUnit;
}) {
  const [chosen, setChosen] = useState("");
  const tracks = progressTracks(sessions),
    track = tracks.find((t) => t.key === chosen) || tracks[0];
  const all = track ? progressPoints(sessions, track, unit) : [],
    points = all.slice(-8),
    week = workoutWeek(sessions);
  const best = all.length
    ? all.reduce(
        (best, p) =>
          track.kind === "assisted"
            ? Math.min(best, p.value)
            : Math.max(best, p.value),
        all[0].value,
      )
    : null;
  const measure = track ? progressUnit(track, unit) : "";
  const max = Math.max(1, ...points.map((p) => p.value)),
    min = Math.min(0, ...points.map((p) => p.value));
  const xy = points.map((point, i) => ({
    x: 36 + (points.length > 1 ? i / (points.length - 1) : 0.5) * 528,
    y: 154 - ((point.value - min) / (max - min)) * 118,
    point,
  }));
  return (
    <section className="training-progress-view">
      <h2>Your progress</h2>
      <p className="sub">
        Completed sets from your training log. Correct a past session in History
        whenever you need to.
      </p>
      <div className="training-week-stats" aria-label="Last seven days">
        <div>
          <strong>{week.sessions}</strong>
          <span>sessions</span>
        </div>
        <div>
          <strong>{week.sets}</strong>
          <span>completed sets</span>
        </div>
        <div>
          <strong>{week.minutes}</strong>
          <span>logged minutes</span>
        </div>
      </div>
      <p className="sub">
        Last 7 days
        {week.uncorrected
          ? " · sessions over 24 hours need their duration corrected before minutes count here."
          : " · elapsed minutes unless corrected in History."}
      </p>
      {!tracks.length ? (
        <div className="training-empty">
          <h3>Your first finished session starts the picture.</h3>
          <p>
            Record and complete a session to see exercise trends and your best
            recorded sets here.
          </p>
        </div>
      ) : (
        <>
          <label className="training-progress-picker">
            Exercise
            <select
              value={track.key}
              onChange={(e) => setChosen(e.target.value)}
            >
              {tracks.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name} ·{" "}
                  {t.kind === "weight"
                    ? "weight"
                    : t.kind === "assisted"
                      ? "assistance"
                      : t.kind === "band"
                        ? "band"
                        : "bodyweight"}
                  {t.metric === "minutes" ? " · minutes" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="training-chart-head">
            <div>
              <span className="sub">{progressLabel(track)}</span>
              <strong>{best === null ? "—" : `${best} ${measure}`}</strong>
            </div>
            <p className="sub">
              {track.kind === "assisted"
                ? "Less assistance means more of the movement is yours. Reps are listed below."
                : track.kind === "band"
                  ? "Reps are compared within this band track; band resistance can vary."
                  : track.kind === "weight"
                    ? `Loads converted to ${unit}; recorded reps are listed below.`
                    : "Results are compared within this exercise and load type."}
            </p>
          </div>
          {!points.length ? (
            <p className="training-empty">
              This exercise has completed sets, but no recorded load to compare
              yet.
            </p>
          ) : (
            <>
              <figure className="training-chart">
                <svg
                  viewBox="0 0 600 200"
                  role="img"
                  aria-label={`${track.name}: ${points.map((p) => `${longDate(p.date)}, ${p.value} ${measure}`).join("; ")}`}
                >
                  <line
                    x1="36"
                    y1="154"
                    x2="564"
                    y2="154"
                    className="chart-baseline"
                  />
                  {xy.length > 1 && (
                    <polyline
                      points={xy.map((p) => `${p.x},${p.y}`).join(" ")}
                      className="chart-line"
                    />
                  )}
                  {xy.map(({ x, y, point }, i) => (
                    <g
                      key={point.sessionId}
                      className={
                        i === 0 || i === xy.length - 1
                          ? "chart-endpoint"
                          : "chart-middle"
                      }
                    >
                      <circle cx={x} cy={y} r="5" className="chart-dot" />
                      <text
                        className="chart-value"
                        x={x}
                        y={y - 13}
                        textAnchor="middle"
                      >
                        {point.value}
                      </text>
                      {(i === 0 || i === xy.length - 1) && (
                        <text
                          x={x}
                          y="184"
                          textAnchor="middle"
                          className="chart-date"
                        >
                          {new Date(
                            `${point.date}T12:00:00Z`,
                          ).toLocaleDateString("en-US", {
                            timeZone: "UTC",
                            month: "short",
                            day: "numeric",
                          })}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
                <figcaption className="sub">
                  {points.length === 1
                    ? "One recorded session. Your next session will add a comparison."
                    : `Last ${points.length} sessions · ${measure}`}
                </figcaption>
              </figure>
              <details className="training-chart-data">
                <summary>View recorded values</summary>
                <div className="training-chart-table">
                  <table>
                    <caption className="sr-only">
                      {track.name} recorded results
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">{measure}</th>
                        {["weight", "assisted"].includes(track.kind) && (
                          <th scope="col">Reps at that load</th>
                        )}
                        <th scope="col">Completed sets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...points].reverse().map((p) => (
                        <tr key={p.sessionId}>
                          <th scope="row">{longDate(p.date)}</th>
                          <td>{p.value}</td>
                          {["weight", "assisted"].includes(track.kind) && (
                            <td>{p.reps}</td>
                          )}
                          <td>{p.sets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}
