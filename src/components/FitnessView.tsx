"use client";
import { cloudStorage } from "@/lib/cloud-storage";


import Link from "next/link";
import { useCloudRevision } from "@/lib/use-cloud-revision";
import { useEffect, useState } from "react";
import {
  WORKOUT_DAYS,
  NUTRITION_GUIDE,
  MEAL_IDEAS,
  GYM_TIPS,
  type WorkoutDay,
  type Exercise,
} from "@/lib/fitness-data";

export default function FitnessView() {
  const cloudRevision = useCloudRevision();
  const [weekStart, setWeekStart] = useState("");
  const [activeDayIdx, setActiveDayIdx] = useState<number>(1); // Default to Monday
  const [view, setView] = useState<"gym" | "home">("gym");
  const [tab, setTab] = useState<"schedule" | "nutrition" | "tips">("schedule");
  const [checkedSets, setCheckedSets] = useState<Record<string, boolean>>({});
  
  // Rest Timer State
  const [restSeconds, setRestSeconds] = useState<number>(0);
  const [restInitial, setRestInitial] = useState<number>(0);
  const [isResting, setIsResting] = useState<boolean>(false);

  // Auto-detect current day in Mountain Time
  useEffect(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        weekday: "long",
      }).format(new Date());
      const idx = WORKOUT_DAYS.findIndex((d) => d.day.toLowerCase() === parts.toLowerCase());
      if (cloudRevision === 0 && idx !== -1) setActiveDayIdx(idx);

      // Load checked sets
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
      const monday = new Date(`${date}T12:00:00Z`);
      monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
      const week = monday.toISOString().slice(0, 10);
      setWeekStart(week);
      const saved = cloudStorage.getItem("daymark:workout:sets");
      if (saved) {
        const sets = JSON.parse(saved);
        const migrated = Object.fromEntries(Object.entries(sets).map(([k,v]) => [/^\d{4}-/.test(k) ? k : `${week}:${k}`,v]));
        setCheckedSets(migrated as Record<string, boolean>);
        if (JSON.stringify(sets) !== JSON.stringify(migrated)) cloudStorage.setItem("daymark:workout:sets", JSON.stringify(migrated));
      }
    } catch {}
  }, [cloudRevision]);

  // Rest timer countdown
  useEffect(() => {
    let t: any = null;
    if (isResting && restSeconds > 0) {
      t = setInterval(() => {
        setRestSeconds((s) => s - 1);
      }, 1000);
    } else if (isResting && restSeconds === 0) {
      setIsResting(false);
      // Play soft completion chime using Web Audio
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch {}
    }
    return () => clearInterval(t);
  }, [isResting, restSeconds]);

  const startRestTimer = (secs: number) => {
    setRestInitial(secs);
    setRestSeconds(secs);
    setIsResting(true);
  };

  const cancelRestTimer = () => {
    setIsResting(false);
    setRestSeconds(0);
  };

  const toggleSet = (key: string) => {
    const next = { ...checkedSets, [key]: !checkedSets[key] };
    setCheckedSets(next);
    try {
      cloudStorage.setItem("daymark:workout:sets", JSON.stringify(next));
      const history = JSON.parse(cloudStorage.getItem("daymark:workout:history") || "{}");
      history[crypto.randomUUID()] = { at: new Date().toISOString(), set: key, completed: next[key] };
      cloudStorage.setItem("daymark:workout:history", JSON.stringify(history));
    } catch {}
  };

  const clearTodaySets = () => {
    const current = WORKOUT_DAYS[activeDayIdx];
    const prefix = `${weekStart}:${current.day}:`;
    const next = { ...checkedSets };
    for (const k of Object.keys(next)) {
      if (k.startsWith(prefix)) delete next[k];
    }
    setCheckedSets(next);
    try {
      cloudStorage.setItem("daymark:workout:sets", JSON.stringify(next));
    } catch {}
  };

  const current: WorkoutDay = WORKOUT_DAYS[activeDayIdx];
  const exercises: Exercise[] = view === "gym" ? current.gym : current.home;

  const totalPossibleSets = exercises.reduce((acc, ex) => {
    const m = ex.sets.match(/^(\d+)×/);
    return acc + (m ? parseInt(m[1], 10) : 3);
  }, 0);

  const completedSetsCount = exercises.reduce((acc, ex) => {
    const m = ex.sets.match(/^(\d+)×/);
    const count = m ? parseInt(m[1], 10) : 3;
    let done = 0;
    for (let s = 1; s <= count; s++) {
      if (checkedSets[`${weekStart}:${current.day}:${ex.name}:${s}`]) done++;
    }
    return acc + done;
  }, 0);

  const workoutPct = totalPossibleSets > 0 ? Math.round((completedSetsCount / totalPossibleSets) * 100) : 0;

  return (
    <div className="wrap fitness-page-wrap">
      {/* Top Header */}
      <div className="fitness-hero">
        <div className="fitness-hero-top">
          <Link href="/" className="backlink mono">
            ← dashboard
          </Link>
          <span className="pill mono live">
            Personal Training & Health · Fall 2026
          </span>
        </div>

        <div className="fitness-hero-content">
          <h1 className="fitness-main-title">Training &amp; Fitness Station</h1>
          <p className="sub mono">
            6-day lean bulk split, gym machine vs home variations, nutrition formulas &amp; anxiety guide
          </p>
        </div>

        {/* Global Nav Tabs */}
        <div className="fitness-view-tabs mono">
          <button
            type="button"
            className={`fv-tab ${tab === "schedule" ? "on" : ""}`}
            onClick={() => setTab("schedule")}
          >
            🏋️ Training Split
          </button>
          <button
            type="button"
            className={`fv-tab ${tab === "nutrition" ? "on" : ""}`}
            onClick={() => setTab("nutrition")}
          >
            🥩 Lean Bulk Nutrition
          </button>
          <button
            type="button"
            className={`fv-tab ${tab === "tips" ? "on" : ""}`}
            onClick={() => setTab("tips")}
          >
            🧭 Gym Anxiety &amp; Etiquette
          </button>
        </div>
      </div>

      <div className="rule" />

      {/* TAB 1: WORKOUT TRAINING */}
      {tab === "schedule" && (
        <section className="card span12 fitness-card">
          <div className="card-body">
            {/* Day Selector Pills */}
            <div className="fit-day-pills mono">
              {WORKOUT_DAYS.map((d, i) => (
                <button
                  key={d.day}
                  type="button"
                  className={`fit-day-btn ${activeDayIdx === i ? "on" : ""}`}
                  style={activeDayIdx === i ? { borderColor: d.color, color: d.color } : {}}
                  onClick={() => setActiveDayIdx(i)}
                >
                  <span className="fit-day-name">{d.day.slice(0, 3).toUpperCase()}</span>
                  <span className="fit-day-sub">{d.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            {/* Current Day Header Banner */}
            <div
              className="fit-current-banner"
              style={{ borderLeftColor: current.color }}
            >
              <div className="fcb-left">
                <div className="fcb-day mono" style={{ color: current.color }}>
                  {current.day.toUpperCase()}
                </div>
                <div className="fcb-label">{current.label}</div>
              </div>

              {!current.isRest && (
                <div className="fcb-right">
                  <div className="fcb-progress mono">
                    <span>{completedSetsCount} / {totalPossibleSets} sets</span>
                    <span className="pill mono">{workoutPct}% done</span>
                  </div>
                  {completedSetsCount > 0 && (
                    <button
                      type="button"
                      className="fit-reset-btn mono"
                      onClick={clearTodaySets}
                      title="Reset completed sets for this day"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rest Timer Bar */}
            {!current.isRest && (
              <div className="fit-rest-timer-bar mono">
                <span className="frt-label">⏱️ Rest Between Sets:</span>
                <div className="frt-buttons">
                  <button type="button" className="frt-btn" onClick={() => startRestTimer(60)}>
                    60s
                  </button>
                  <button type="button" className="frt-btn" onClick={() => startRestTimer(90)}>
                    90s
                  </button>
                  <button type="button" className="frt-btn" onClick={() => startRestTimer(120)}>
                    120s
                  </button>
                  {isResting && (
                    <div className="frt-active">
                      <span className="frt-clock">
                        {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}
                      </span>
                      <button type="button" className="frt-stop" onClick={cancelRestTimer}>
                        ✕ Stop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rest Day Message */}
            {current.isRest ? (
              <div className="fit-rest-container">
                <div className="frc-icon">🛌</div>
                <div className="frc-title">Active Recovery &amp; Muscle Growth Day</div>
                <p className="sub" style={{ maxWidth: 540, margin: "8px auto 20px" }}>
                  Muscles grow during recovery and sleep, not during the lift. Focus on light walking, hydration, and high-protein nutrition.
                </p>
                <div className="fit-exercises-list">
                  {current.home.map((ex, i) => (
                    <div key={i} className="fit-exercise-card" style={{ borderLeftColor: current.color }}>
                      <div className="fec-top">
                        <span className="fec-name">{ex.name}</span>
                        <span className="fec-sets mono" style={{ background: current.color, color: "#000" }}>
                          {ex.sets}
                        </span>
                      </div>
                      <div className="fec-tip mono">→ {ex.tip}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Gym vs Home Toggle */}
                <div className="fit-mode-toggle mono">
                  <button
                    type="button"
                    className={`fmt-btn ${view === "gym" ? "on" : ""}`}
                    style={view === "gym" ? { background: current.color, color: "#000" } : {}}
                    onClick={() => setView("gym")}
                  >
                    🏋️ GYM MACHINES
                  </button>
                  <button
                    type="button"
                    className={`fmt-btn ${view === "home" ? "on" : ""}`}
                    style={view === "home" ? { background: current.color, color: "#000" } : {}}
                    onClick={() => setView("home")}
                  >
                    🏠 HOME &amp; BANDS
                  </button>
                </div>

                {/* Exercises Grid */}
                <div className="fit-exercises-list">
                  {exercises.map((ex, i) => {
                    const match = ex.sets.match(/^(\d+)×/);
                    const setCount = match ? parseInt(match[1], 10) : 3;

                    return (
                      <div key={i} className="fit-exercise-card" style={{ borderLeftColor: current.color }}>
                        <div className="fec-top">
                          <div className="fec-info">
                            <span className="fec-num mono">0{i + 1}</span>
                            <span className="fec-name">{ex.name}</span>
                          </div>
                          <span className="fec-sets mono" style={{ background: current.color, color: "#000" }}>
                            {ex.sets}
                          </span>
                        </div>

                        {/* Interactive Set Checkboxes */}
                        <div className="fec-sets-checkboxes mono">
                          <span className="fec-set-lbl">Log Sets:</span>
                          {Array.from({ length: setCount }, (_, sIdx) => {
                            const setNum = sIdx + 1;
                            const key = `${weekStart}:${current.day}:${ex.name}:${setNum}`;
                            const isDone = !!checkedSets[key];

                            return (
                              <button
                                key={setNum}
                                type="button"
                                className={`fec-set-pill ${isDone ? "done" : ""}`}
                                onClick={() => toggleSet(key)}
                                title={`Toggle Set ${setNum}`}
                              >
                                {isDone ? `✓ S${setNum}` : `S${setNum}`}
                              </button>
                            );
                          })}
                        </div>

                        <div className="fec-tip mono">
                          <span className="fec-tip-icon">💡 Coaching Form Cue:</span> {ex.tip}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: NUTRITION & LEAN BULK */}
      {tab === "nutrition" && (
        <section className="card span12 fitness-card">
          <div className="card-head">
            <h2>Lean Bulk Nutrition Guide</h2>
            <span className="pill mono">Food is your second workout</span>
          </div>
          <div className="card-body">
            <div className="fit-nutrition-grid">
              {NUTRITION_GUIDE.map((n, i) => (
                <div key={i} className="fit-nutrition-card" style={{ borderTopColor: n.color }}>
                  <div className="fnc-head">
                    <span className="fnc-icon">{n.icon}</span>
                    <span className="fnc-title" style={{ color: n.color }}>{n.title}</span>
                  </div>
                  <ul className="fnc-list">
                    {n.items.map((it, j) => (
                      <li key={j}>
                        <span className="fnc-dot" style={{ color: n.color }}>▸</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Quick Meal Ideas */}
            <div className="fit-meals-card">
              <div className="fmc-head mono">
                <span>🍳 Quick Lean-Bulk Meal Formulas</span>
              </div>
              <div className="fmc-grid">
                {MEAL_IDEAS.map((m, i) => (
                  <div key={i} className="fmc-item">
                    <span className="fmc-k mono">{m.meal.toUpperCase()}</span>
                    <span className="fmc-v">{m.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplement Note */}
            <div className="fit-supp-note mono">
              <span className="fsn-badge">💊 Supplement Reality Check:</span>
              <p>
                <b>Creatine monohydrate (5g/day, every day)</b> is the gold standard for muscle hydration and ATP power output. <b>Whey protein isolate</b> is simply convenient food in powder form to hit your 0.8–1g/lb target. Everything else is secondary to sleep and consistent surplus.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: GYM ANXIETY & TIPS */}
      {tab === "tips" && (
        <section className="card span12 fitness-card">
          <div className="card-head">
            <h2>Navigating the Gym with Social Anxiety</h2>
            <span className="pill mono">UNM Johnson Center &amp; Campus Guide</span>
          </div>
          <div className="card-body">
            <div className="fit-tips-grid">
              {GYM_TIPS.map((sec, i) => (
                <div key={i} className="fit-tip-card" style={{ borderTopColor: sec.color }}>
                  <div className="ftc-head">
                    <span className="ftc-icon">{sec.icon}</span>
                    <span className="ftc-title" style={{ color: sec.color }}>{sec.title}</span>
                  </div>
                  <ul className="ftc-list">
                    {sec.tips.map((t, j) => (
                      <li key={j}>
                        <span className="ftc-bullet" style={{ color: sec.color }}>▸</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
