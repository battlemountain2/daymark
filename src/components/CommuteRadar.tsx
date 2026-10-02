"use client";

import React, { useState, useMemo } from "react";
import { hhmm } from "@/lib/schedule";

type Props = {
  nextClass: {
    code: string;
    title: string;
    where: string;
    start: string;
    end: string;
    ck: string;
  } | null;
  nowMinutes: number;
  doneForToday?: boolean;
  weather?: {
    tempF: number | null;
    sky: string | null;
    windMph: number | null;
    precipChance: number | null;
  } | null;
};

export default function CommuteRadar({ nextClass, nowMinutes, weather, doneForToday = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [isAdvisoryLoading, setIsAdvisoryLoading] = useState(false);

  const handleFetchAdvisory = async () => {
    if (!nextClass || !commutePlan) return;
    setIsAdvisoryLoading(true);
    try {
      const res = await fetch("/api/study-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commute_advisory",
          classTitle: nextClass.title || nextClass.code,
          classWhere: nextClass.where,
          classStart: fmtTime(commutePlan.classStartMins),
          driveMins: commutePlan.driveMins,
          leaveByTime: fmtTime(commutePlan.leaveByMinutes),
          minutesUntilLeave: commutePlan.minutesUntilLeave,
          weather,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setAdvisory(json.advisory || null);
      }
    } catch (e) {
      console.warn("Commute advisory error", e);
    } finally {
      setIsAdvisoryLoading(false);
    }
  };

  const commutePlan = useMemo(() => {
    if (!nextClass) return null;

    const classStartMins = hhmm(nextClass.start);
    const hall = nextClass.where.toLowerCase();

    // 1. Campus walk time from Yale Mall shuttle stop
    let campusWalkMins = 4;
    if (hall.includes("bandelier")) campusWalkMins = 3;
    else if (hall.includes("mitchell")) campusWalkMins = 4;
    else if (hall.includes("ortega")) campusWalkMins = 4;

    // 2. South Lot shuttle transit & wait
    const shuttleWaitMins = 6;
    const shuttleRideMins = 7;

    // 3. Drive time from Unser & Gibson SW to South Lot (via Gibson Blvd bridge)
    let driveMins = 18;
    const isPeakHour = (nowMinutes >= 450 && nowMinutes <= 540) || (nowMinutes >= 750 && nowMinutes <= 840);
    if (isPeakHour) driveMins += 5; // River crossing traffic delay

    // Weather impact buffer
    let weatherBufferMins = 0;
    const isHighWind = (weather?.windMph || 0) >= 24;
    const isRain = (weather?.precipChance || 0) >= 40 || /rain|shower/i.test(weather?.sky || "");
    if (isHighWind || isRain) {
      weatherBufferMins = 4;
    }

    const totalTransitMins = driveMins + shuttleWaitMins + shuttleRideMins + campusWalkMins + weatherBufferMins;
    const leaveByMinutes = classStartMins - totalTransitMins;
    const minutesUntilLeave = leaveByMinutes - nowMinutes;

    return {
      classStartMins,
      driveMins,
      shuttleWaitMins,
      shuttleRideMins,
      campusWalkMins,
      weatherBufferMins,
      totalTransitMins,
      leaveByMinutes,
      minutesUntilLeave,
      isPeakHour,
      isHighWind,
      isRain,
    };
  }, [nextClass, nowMinutes, weather]);

  const fmtTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  if (!nextClass || !commutePlan) {
    return (
      <div className="commute-radar-card mono">
        <div className="cr-header">
          <span className="cr-icon">🚗</span>
          <span className="cr-title">UNM Commute Radar</span>
          <span className="cr-tag">{doneForToday ? "Done for today" : "Standby"}</span>
        </div>
        <p className="cr-desc sub">{doneForToday ? "All classes finished. Safe travels!" : "No upcoming on-campus classes scheduled today. Safe travels!"}</p>
      </div>
    );
  }

  const {
    driveMins,
    shuttleWaitMins,
    shuttleRideMins,
    campusWalkMins,
    weatherBufferMins,
    totalTransitMins,
    leaveByMinutes,
    minutesUntilLeave,
    isPeakHour,
    isHighWind,
    isRain,
  } = commutePlan;

  let statusTone = "ontime";
  let statusText = `Leave home in ${minutesUntilLeave}m`;

  if (minutesUntilLeave <= 0 && minutesUntilLeave >= -totalTransitMins) {
    statusTone = "transit";
    statusText = "Departure time reached";
  } else if (minutesUntilLeave <= 15 && minutesUntilLeave > 0) {
    statusTone = "urgent";
    statusText = `🔥 Leave by ${fmtTime(leaveByMinutes)} (${minutesUntilLeave}m left)`;
  } else if (minutesUntilLeave < -totalTransitMins) {
    statusTone = "past";
    statusText = "Class in session";
  }

  return (
    <div className={`commute-radar-card ${statusTone} mono`}>
      <div className="cr-header">
        <div className="cr-title-group">
          <span className="cr-icon">🚗</span>
          <div>
            <span className="cr-title">South Lot Commute Radar</span>
            <span className="cr-sub">Unser &amp; Gibson ➔ South Lot ➔ {nextClass.code}</span>
          </div>
        </div>
        <div className="cr-status-badge">
          <span className="cr-dot" />
          <span>{statusText}</span>
        </div>
      </div>

      <div className="cr-primary-row">
        <div className="cr-target-block">
          <span className="cr-k">{nowMinutes >= commutePlan.classStartMins ? "Current class:" : "Next class:"}</span>
          <span className="cr-v">{nextClass.code} · {fmtTime(commutePlan.classStartMins)}</span>
          <span className="cr-hall">{nextClass.where}</span>
        </div>

        {nowMinutes < commutePlan.classStartMins && <div className="cr-countdown-block">
          <span className="cr-k">Leave by:</span>
          <span className="cr-leave-time">{fmtTime(leaveByMinutes)}</span>
          <span className="cr-budget-meta">{totalTransitMins}m estimated trip</span>
        </div>}
      </div>

      <details className="cr-details">
        <summary>Route details &amp; advisory</summary>
      {/* Weather or Traffic Alerts */}
      {(isPeakHour || isHighWind || isRain) && (
        <div className="cr-alert-strip">
          {isPeakHour && <span>⚠️ Peak Gibson Blvd River Traffic (+5m added)</span>}
          {isHighWind && <span>💨 High Sandia Canyon Crosswinds (+4m buffer)</span>}
          {isRain && <span>🌧️ Albuquerque Rain Caution (+4m buffer)</span>}
        </div>
      )}

      {/* Copilot Live Route Advisory */}
      <div style={{ margin: "10px 0 6px", display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          className="cr-toggle-btn"
          style={{ width: "fit-content", padding: "4px 10px", fontSize: 11 }}
          onClick={handleFetchAdvisory}
          disabled={isAdvisoryLoading}
        >
          {isAdvisoryLoading ? "⚡ Analyzing Route via Copilot..." : "✦ Copilot Route Advisory"}
        </button>
        {advisory && (
          <div style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 6, padding: "8px 12px", fontSize: 12, lineHeight: 1.45, color: "var(--ink)" }}>
            <strong>🚗 Copilot SitRep:</strong> {advisory}
          </div>
        )}
      </div>

      {/* Expandable Route Timeline */}
      <button
        type="button"
        className="cr-toggle-btn"
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded ? "▲ Hide Transit Stages" : "▼ View Multi-Stage Route Breakdown (4 Stages)"}
      </button>

      {isExpanded && (
        <div className="cr-stages-timeline">
          <div className="cr-stage-item">
            <div className="cr-stage-dot" />
            <div className="cr-stage-info">
              <div className="cr-stage-head">
                <span className="cr-stage-name">1. Drive Gibson Blvd Corridor</span>
                <span className="cr-stage-duration">{driveMins} mins</span>
              </div>
              <p className="cr-stage-sub">Unser &amp; Gibson SW ➔ Cross Rio Grande river bridge ➔ University Blvd SE.</p>
            </div>
          </div>

          <div className="cr-stage-item">
            <div className="cr-stage-dot" />
            <div className="cr-stage-info">
              <div className="cr-stage-head">
                <span className="cr-stage-name">2. Park &amp; Shuttle Wait (South Lot)</span>
                <span className="cr-stage-duration">{shuttleWaitMins} mins</span>
              </div>
              <p className="cr-stage-sub">Park at UNM South Lot (1414 University Blvd). Shuttles run every 7–10m.</p>
            </div>
          </div>

          <div className="cr-stage-item">
            <div className="cr-stage-dot" />
            <div className="cr-stage-info">
              <div className="cr-stage-head">
                <span className="cr-stage-name">3. South Lot Shuttle Ride</span>
                <span className="cr-stage-duration">{shuttleRideMins} mins</span>
              </div>
              <p className="cr-stage-sub">Non-stop campus transit line up University Blvd to Yale Mall / Popejoy drop-off.</p>
            </div>
          </div>

          <div className="cr-stage-item final">
            <div className="cr-stage-dot final" />
            <div className="cr-stage-info">
              <div className="cr-stage-head">
                <span className="cr-stage-name">4. Yale Mall to {nextClass.where.split(" ")[0]} Hall</span>
                <span className="cr-stage-duration">{campusWalkMins} mins</span>
              </div>
              <p className="cr-stage-sub">Walk through main campus to {nextClass.where}. Arrive 5m before lecture.</p>
            </div>
          </div>
        </div>
      )}
      </details>
    </div>
  );
}
