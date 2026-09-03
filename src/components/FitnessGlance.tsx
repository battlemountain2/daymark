"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WORKOUT_DAYS, type WorkoutDay } from "@/lib/fitness-data";

export default function FitnessGlance() {
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay>(WORKOUT_DAYS[1]);

  useEffect(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        weekday: "long",
      }).format(new Date());
      const found = WORKOUT_DAYS.find((d) => d.day.toLowerCase() === parts.toLowerCase());
      if (found) setTodayWorkout(found);
    } catch {}
  }, []);

  const exerciseCount = todayWorkout.isRest ? 0 : todayWorkout.gym.length;

  return (
    <section className="card span5 fitness-glance-card">
      <div className="card-head">
        <h2>Today&apos;s Workout</h2>
        <Link href="/fitness" className="morelink mono">
          open split →
        </Link>
      </div>

      <div className="card-body">
        <div className="fg-top-stat mono">
          <span style={{ color: todayWorkout.color, fontWeight: 700 }}>
            {todayWorkout.day.toUpperCase()}
          </span>
          <span className="pill mono" style={{ borderColor: todayWorkout.color, color: todayWorkout.color }}>
            {todayWorkout.label}
          </span>
        </div>

        <div className="fg-hero-box">
          <div className="fg-title">{todayWorkout.label}</div>
          <div className="fg-sub sub">
            {todayWorkout.isRest
              ? "Active recovery: 20m light walk, full body stretching, and high protein."
              : `${exerciseCount} exercises scheduled (Gym machines or Home bands).`}
          </div>
          {!todayWorkout.isRest && (
            <div className="fg-tip-pill mono">
              🕐 Best gym window: <b>1:00 PM – 3:00 PM</b> (low crowds)
            </div>
          )}
        </div>

        <div className="fg-action-row">
          <Link href="/fitness" className="glance-btn mono" style={{ borderColor: todayWorkout.color }}>
            {todayWorkout.isRest ? "View Recovery Guide →" : `Start ${todayWorkout.label} →`}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FitnessGlanceSkeleton() {
  return (
    <section className="card span5 fitness-glance-card">
      <div className="card-head">
        <h2>Today&apos;s Workout</h2>
        <span className="pill mono">loading</span>
      </div>
      <div className="card-body">
        <span className="bar" style={{ width: "50%", height: 16 }} />
        <span className="bar" style={{ width: "80%", height: 32, marginTop: 10 }} />
      </div>
    </section>
  );
}
