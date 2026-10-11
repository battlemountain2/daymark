"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WORKOUT_DAYS } from "@/lib/fitness-data";
import { useCloudRevision } from "@/lib/use-cloud-revision";
import { localParts } from "@/lib/schedule";
import { longDate } from "@/lib/localtime";
import { restRemaining } from "@/lib/workout-timer";
import { usePersonalRecords } from "@/lib/use-personal-records";
import {
  WORKOUT_SESSIONS_KEY,
  newWorkoutSession,
  changeLoggedSet,
  finishWorkout,
  workoutProgress,
  workoutMinutes,
  previousExercise,
  exerciseResult,
  type WorkoutSession,
  type WeightUnit,
} from "@/lib/workout-sessions";
import RecordTrash from "./RecordTrash";
import WorkoutProgress from "./WorkoutProgress";
import { parseWorkoutDuration } from "@/lib/workout-progress";
import FitnessResources from "./FitnessResources";
import WorkoutExercise from "./WorkoutExercise";

type Tab = "plan" | "session" | "history" | "progress" | "nutrition" | "tips";
export type PendingWorkoutInput = {
  exercise: string;
  index: number;
  field: "weight" | "reps";
  value: string;
};

export default function FitnessView({
  initialSessionId,
}: {
  initialSessionId?: string;
}) {
  const { records, trash, restore, write, update, error, loaded } =
    usePersonalRecords<WorkoutSession>(WORKOUT_SESSIONS_KEY);
  const [tab, setTab] = useState<Tab>(initialSessionId ? "session" : "plan"),
    [dayIndex, setDayIndex] = useState(1);
  const [mode, setMode] = useState<"gym" | "home">("gym"),
    [unit, setUnit] = useState<WeightUnit>("lb");
  const cloudRevision = useCloudRevision();
  const unitChosen = useRef(false);
  const [selected, setSelected] = useState<string | null>(
      initialSessionId || null,
    ),
    [message, setMessage] = useState("");
  const [draftNote, setDraftNote] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [durationDraft, setDurationDraft] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [inputs, setInputs] = useState<Record<string, PendingWorkoutInput>>({});
  const [undo, setUndo] = useState<{
    snapshot: WorkoutSession;
    expected: string;
  } | null>(null);
  const [discarded, setDiscarded] = useState<WorkoutSession | null>(null);
  const [legacy, setLegacy] = useState<Array<[string, number]>>([]),
    [restLeft, setRestLeft] = useState(0);
  const sessions = Object.values(records).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  const active = sessions.find((s) => !s.finishedAt),
    session = selected ? records[selected] : active;
  const plan = WORKOUT_DAYS[dayIndex],
    exercises = mode === "gym" ? plan.gym : plan.home;
  const pending =
      Object.keys(inputs).length > 0 ||
      draftNote !== null ||
      durationDraft !== null,
    progress = session ? workoutProgress(session) : { done: 0, total: 0 };
  const [openedSaved, setOpenedSaved] = useState(false);
  useEffect(() => {
    if (loaded && !openedSaved) {
      setOpenedSaved(true);
      if (active && !initialSessionId) {
        setSelected(active.id);
        setTab("session");
      }
    }
  }, [loaded, openedSaved, active, initialSessionId]);

  useEffect(() => {
    setDayIndex(WORKOUT_DAYS.findIndex((d) => d.dow === localParts().dow));
    try {
      const groups: Record<string, number> = {};
      for (const [key, done] of Object.entries(
        JSON.parse(localStorage.getItem("daymark:workout:sets") || "{}"),
      ))
        if (done) {
          const [week, day] = key.split(":");
          if (/^\d{4}-\d{2}-\d{2}$/.test(week))
            groups[`${week} · ${day}`] = (groups[`${week} · ${day}`] || 0) + 1;
        }
      setLegacy(
        Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])),
      );
    } catch {}
  }, []);
  useEffect(() => {
    if (unitChosen.current) return;
    try {
      setUnit(
        JSON.parse(localStorage.getItem("daymark:layout") || "{}")
          .workoutUnit === "kg"
          ? "kg"
          : "lb",
      );
    } catch {}
  }, [cloudRevision]);
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  const deadline = session?.rest?.deadline,
    sessionId = session?.id;
  useEffect(() => {
    if (!deadline || !sessionId) {
      setRestLeft(0);
      return;
    }
    let completed = false;
    const tick = () => {
      const remaining = restRemaining(deadline);
      setRestLeft(remaining);
      if (remaining || completed) return;
      completed = true;
      update(sessionId, (current) =>
        current?.rest?.deadline === deadline
          ? { ...current, rest: null }
          : current || null,
      );
      try {
        const ctx = new AudioContext(),
          osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.08;
        osc.frequency.value = 660;
        osc.onended = () => void ctx.close();
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch {}
    };
    tick();
    const timer = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, sessionId, update]);

  function navigate(next: Tab, id?: string) {
    if (pending) {
      setMessage("Save your entries before switching. Retry saving below.");
      return;
    }
    setMessage("");
    setUndo(null);
    if (id) setSelected(id);
    else if (next === "session") setSelected(active?.id || null);
    setTab(next);
  }
  function changeSession(
    change: (current: WorkoutSession) => WorkoutSession,
    revision?: string,
  ) {
    if (!session) return false;
    let problem = "";
    const saved = update(session.id, (current) => {
      if (!current) {
        problem =
          "This session is unavailable. Reload your history before editing.";
        throw Error(problem);
      }
      try {
        return {
          ...change(current),
          updatedAt:
            revision ||
            new Date(
              Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
            ).toISOString(),
        };
      } catch (e) {
        problem =
          e instanceof Error ? e.message : "Could not update this session.";
        throw e;
      }
    });
    setMessage(problem);
    return saved;
  }
  function enter(
    exercise: string,
    index: number,
    field: "weight" | "reps",
    value: string,
  ) {
    const key = `${exercise}:${index}:${field}`;
    setInputs((old) => ({ ...old, [key]: { exercise, index, field, value } }));
    if (
      changeSession((s) =>
        changeLoggedSet(s, exercise, index, { [field]: value }),
      )
    )
      setInputs((old) => {
        const next = { ...old };
        delete next[key];
        return next;
      });
  }
  function retry() {
    if (
      changeSession((s) => {
        const next = Object.values(inputs).reduce(
          (next, input) =>
            changeLoggedSet(next, input.exercise, input.index, {
              [input.field]: input.value,
            }),
          s,
        );
        return {
          ...next,
          ...(draftNote?.id === s.id ? { note: draftNote.value } : {}),
          ...(durationDraft?.id === s.id
            ? { durationMinutes: parseWorkoutDuration(durationDraft.value) }
            : {}),
        };
      })
    ) {
      setInputs({});
      setDraftNote(null);
      setDurationDraft(null);
    }
  }
  function start() {
    if (pending || active || !loaded) return;
    const next = newWorkoutSession(
      plan,
      mode,
      unit,
      sessions,
      crypto.randomUUID(),
    );
    if (write(next.id, next)) {
      setSelected(next.id);
      setTab("session");
      setMessage("");
    }
  }
  function clearCompleted() {
    if (!session || pending) return;
    const snapshot = session,
      expected = new Date(
        Math.max(Date.now(), Date.parse(session.updatedAt) + 1),
      ).toISOString();
    if (
      changeSession(
        (s) => ({
          ...s,
          updatedAt: expected,
          rest: null,
          exercises: s.exercises.map((ex) => ({
            ...ex,
            sets: ex.sets.map((set) => ({ ...set, done: false })),
          })),
        }),
        expected,
      )
    )
      setUndo({ snapshot, expected });
  }

  return (
    <main className="wrap fitness-page-wrap training-room">
      <header className="training-header">
        <Link
          href="/?space=main"
          className="backlink"
          onClick={(e) => {
            if (pending) {
              e.preventDefault();
              setMessage(
                "Save your entries before leaving. Retry saving below.",
              );
            }
          }}
        >
          ← Dashboard
        </Link>
        <div>
          <p className="training-eyebrow">Your routine, your progress</p>
          <h1>Your training</h1>
        </div>
        <nav className="training-tabs" aria-label="Training views">
          {(["plan", "session", "history", "progress"] as const).map((view) => (
            <button
              type="button"
              key={view}
              aria-pressed={tab === view}
              onClick={() => navigate(view)}
            >
              {view === "session" && active
                ? "Session · in progress"
                : view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </nav>
      </header>
      {(error || message) && (
        <p className="training-error" role="alert">
          {message || error}
          {pending && (
            <button type="button" onClick={retry}>
              Retry saving
            </button>
          )}
        </p>
      )}
      {!loaded && <p role="status">Loading your training log…</p>}
      {discarded && (
        <p role="status">
          Session removed.{" "}
          <button
            type="button"
            onClick={() => {
              if (restore(discarded.id)) {
                setSelected(discarded.id);
                setDiscarded(null);
                setTab("session");
              }
            }}
          >
            Undo removal
          </button>
        </p>
      )}
      {tab === "plan" && (
        <section className="training-plan">
          {active && (
            <div className="training-resume">
              <div>
                <strong>{active.title}</strong>
                <span className="sub">
                  {longDate(active.performedOn)} ·{" "}
                  {workoutProgress(active).done}/{workoutProgress(active).total}{" "}
                  sets
                </span>
              </div>
              <button
                type="button"
                className="training-primary"
                onClick={() => navigate("session", active.id)}
              >
                Continue session
              </button>
            </div>
          )}
          <div className="training-plan-controls">
            <label>
              Routine
              <select
                value={dayIndex}
                onChange={(e) => setDayIndex(Number(e.target.value))}
              >
                {WORKOUT_DAYS.map((day, i) => (
                  <option key={day.day} value={i}>
                    {day.day} · {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "gym" | "home")}
              >
                <option value="gym">Gym</option>
                <option value="home">Home & bands</option>
              </select>
            </label>
            <label>
              Weight unit
              <select
                value={unit}
                onChange={(e) => {
                  unitChosen.current = true;
                  setUnit(e.target.value as WeightUnit);
                }}
              >
                <option value="lb">Pounds · lb</option>
                <option value="kg">Kilograms · kg</option>
              </select>
            </label>
          </div>
          <div className="training-plan-title">
            <div>
              <h2>{plan.label}</h2>
              <p className="sub">
                {plan.day} plan ·{" "}
                {plan.isRest ? "Recovery day" : `${exercises.length} exercises`}{" "}
                · log it on the day you train
              </p>
            </div>
            {(plan.isRest ? plan.home : exercises).length > 0 && (
              <button
                type="button"
                className="training-primary"
                disabled={!loaded || !!active}
                onClick={start}
              >
                {plan.isRest ? "Log recovery" : "Start session"}
              </button>
            )}
          </div>
          {plan.isRest && (
            <p className="sub">
              Keep today light. Your recovery guide stays available below.
            </p>
          )}
          <div className="training-plan-list">
            {(plan.isRest ? plan.home : exercises).map((ex, i) => (
              <article key={ex.id}>
                <span className="training-index mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{ex.name}</h3>
                  <p className="sub">{ex.sets}</p>
                  <details>
                    <summary>Form cue</summary>
                    <p>{ex.tip}</p>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === "session" &&
        (!session ? (
          <section className="training-empty">
            <h2>Ready when you are.</h2>
            <p>Choose a routine, then start a session to record your sets.</p>
            <button type="button" onClick={() => navigate("plan")}>
              Choose a routine
            </button>
          </section>
        ) : (
          <section className="training-session">
            <div className="training-session-heading">
              <div>
                <span className="sub">
                  {longDate(session.performedOn)} ·{" "}
                  {/REST/.test(session.title)
                    ? "Recovery"
                    : session.mode === "gym"
                      ? "Gym"
                      : "Home & bands"}{" "}
                  · {session.unit}
                </span>
                <h2>{session.title}</h2>
              </div>
              <span className="training-count">
                {progress.done}
                <small> / {progress.total} sets</small>
              </span>
            </div>
            <div
              className="training-progress"
              role="progressbar"
              aria-label="Completed sets"
              aria-valuenow={progress.done}
              aria-valuemin={0}
              aria-valuemax={progress.total}
            >
              <span
                style={{
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            {session.finishedAt ? (
              <p className="training-saved">
                Saved session · {workoutMinutes(session)} minutes. You can
                correct any entry below.
              </p>
            ) : (
              <div
                className="training-rest"
                role="group"
                aria-label="Rest timer"
              >
                <strong>
                  {restLeft > 0
                    ? `${Math.floor(restLeft / 60)}:${String(restLeft % 60).padStart(2, "0")}`
                    : "Rest"}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    changeSession((s) => ({
                      ...s,
                      rest: { deadline: Date.now() + 90000, duration: 90 },
                    }))
                  }
                >
                  Start 90s
                </button>
                {restLeft > 0 && (
                  <button
                    type="button"
                    onClick={() => changeSession((s) => ({ ...s, rest: null }))}
                  >
                    Stop
                  </button>
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={session.autoRest}
                    onChange={(e) =>
                      changeSession((s) => ({
                        ...s,
                        autoRest: e.target.checked,
                      }))
                    }
                  />
                  Auto-rest after a set
                </label>
              </div>
            )}
            <div className="training-log-list">
              {session.exercises.map((ex, i) => (
                <WorkoutExercise
                  key={ex.id}
                  exercise={ex}
                  number={i + 1}
                  session={session}
                  previous={previousExercise(
                    sessions,
                    ex.id,
                    session.startedAt,
                  )}
                  pending={pending}
                  inputs={inputs}
                  onEnter={enter}
                  onChange={changeSession}
                  onComplete={(index) => {
                    if (pending) {
                      retry();
                      return;
                    }
                    setUndo(null);
                    changeSession((s) =>
                      changeLoggedSet(s, ex.id, index, {
                        done: !ex.sets[index].done,
                      }),
                    );
                  }}
                />
              ))}
            </div>
            {session.finishedAt && (
              <form
                className="training-duration"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    changeSession((s) => ({
                      ...s,
                      durationMinutes: parseWorkoutDuration(
                        durationDraft?.id === session.id
                          ? durationDraft.value
                          : String(workoutMinutes(session)),
                      ),
                    }))
                  )
                    setDurationDraft(null);
                }}
              >
                <label>
                  Session duration · minutes
                  <input
                    inputMode="numeric"
                    value={
                      durationDraft?.id === session.id
                        ? durationDraft.value
                        : String(workoutMinutes(session))
                    }
                    onChange={(e) =>
                      setDurationDraft({
                        id: session.id,
                        value: e.target.value,
                      })
                    }
                  />
                </label>
                <button type="submit">Save duration</button>
                <p className="sub">
                  {session.durationMinutes === undefined
                    ? "Elapsed time from start to finish. Correct it if you left the session open."
                    : "Your corrected duration is used in progress totals."}
                </p>
              </form>
            )}
            <label className="training-session-note">
              Session notes
              <textarea
                value={
                  draftNote?.id === session.id ? draftNote.value : session.note
                }
                placeholder="Anything you want to remember for next time"
                onChange={(e) => {
                  const value = e.target.value.slice(0, 5000);
                  setDraftNote({ id: session.id, value });
                  if (changeSession((s) => ({ ...s, note: value })))
                    setDraftNote(null);
                }}
              />
            </label>
            <div className="training-session-actions">
              {!session.finishedAt && (
                <button
                  type="button"
                  className="training-primary"
                  disabled={pending || !progress.done}
                  onClick={() => {
                    if (changeSession((s) => finishWorkout(s)))
                      navigate("history");
                  }}
                >
                  Finish session
                </button>
              )}
              {session.finishedAt && (
                <button type="button" onClick={() => navigate("history")}>
                  Back to history
                </button>
              )}
              <button
                type="button"
                disabled={pending || !progress.done}
                onClick={clearCompleted}
              >
                Clear completed marks
              </button>
            </div>
            {(session.finishedAt || !progress.done) && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (write(session.id, null)) {
                    setDiscarded(session);
                    setSelected(null);
                    navigate("plan");
                  }
                }}
              >
                {session.finishedAt
                  ? "Remove session"
                  : "Discard unfinished session"}
              </button>
            )}
            {undo && (
              <p role="status">
                Completed marks cleared; your entries were kept.{" "}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      changeSession((s) => {
                        if (s.updatedAt !== undo.expected)
                          throw Error(
                            "The session changed after clearing. Your latest entries were kept.",
                          );
                        return {
                          ...undo.snapshot,
                          updatedAt: new Date().toISOString(),
                          rest: null,
                        };
                      })
                    )
                      setUndo(null);
                  }}
                >
                  Undo
                </button>
              </p>
            )}
          </section>
        ))}
      {tab === "history" && (
        <section className="training-history">
          <h2>Your sessions</h2>
          <p className="sub">
            Recorded results, with room to correct an entry.
          </p>
          {!sessions.length && (
            <p className="training-empty">
              Your first session will appear here.
            </p>
          )}
          {sessions.map((s) => (
            <button
              type="button"
              key={s.id}
              className="training-history-item"
              onClick={() => navigate("session", s.id)}
            >
              <div>
                <span className="sub">
                  {longDate(s.performedOn)} · {s.mode} · {s.unit}
                </span>
                <strong>{s.title}</strong>
              </div>
              <span>
                {workoutProgress(s).done}/{workoutProgress(s).total} sets
                <small>
                  {s.finishedAt
                    ? `${workoutMinutes(s)} min · Saved`
                    : "In progress"}
                </small>
              </span>
            </button>
          ))}
          {sessions.some((s) => s.finishedAt) && (
            <details className="training-trends">
              <summary>Recent exercise results</summary>
              {Array.from(
                new Set(
                  sessions
                    .filter((s) => s.finishedAt)
                    .flatMap((s) => s.exercises.map((ex) => ex.id)),
                ),
              ).map((id) => {
                const results = sessions
                  .filter(
                    (s) =>
                      s.finishedAt &&
                      s.exercises.some(
                        (ex) => ex.id === id && ex.sets.some((set) => set.done),
                      ),
                  )
                  .slice(0, 4);
                return results.length ? (
                  <div key={id}>
                    <h3>
                      {results[0].exercises.find((ex) => ex.id === id)!.name}
                    </h3>
                    {results.map((s) => (
                      <p key={s.id}>
                        <span className="sub">
                          {longDate(s.performedOn)} ·{" "}
                        </span>
                        {exerciseResult(
                          s.exercises.find((ex) => ex.id === id)!,
                          s.unit,
                        )}
                      </p>
                    ))}
                  </div>
                ) : null;
              })}
            </details>
          )}
          {legacy.length > 0 && (
            <details className="training-legacy">
              <summary>Earlier set checkmarks</summary>
              <p className="sub">
                These marks predate session logging. Their planned week/day is
                preserved; weights and actual session dates were not recorded.
              </p>
              {legacy.map(([label, count]) => (
                <p key={label}>
                  Week of {label} · {count} completed sets
                </p>
              ))}
            </details>
          )}
        </section>
      )}
      {tab === "progress" && (
        <WorkoutProgress sessions={sessions} unit={unit} />
      )}
      {(tab === "history" || tab === "plan") && (
        <RecordTrash
          items={trash}
          title={(item) => `${item.title} · ${longDate(item.performedOn)}`}
          onRestore={(id) => {
            if (pending) return false;
            if (restore(id)) {
              setSelected(id);
              setTab("session");
              setDiscarded(null);
              return true;
            }
            return false;
          }}
        />
      )}
      <details className="training-resources">
        <summary>Nutrition & gym guide</summary>
        <div className="training-resource-links">
          <button type="button" onClick={() => navigate("nutrition")}>
            Nutrition
          </button>
          <button type="button" onClick={() => navigate("tips")}>
            Gym guide
          </button>
        </div>
      </details>
      {(tab === "nutrition" || tab === "tips") && (
        <FitnessResources tab={tab} />
      )}
    </main>
  );
}
