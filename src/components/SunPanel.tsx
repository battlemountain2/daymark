"use client";

import { useEffect, useState } from "react";
import { sunPosition, dayLengthMinutes, daylightSeries, sunEvents } from "@/lib/solar";
import type { Term } from "@/lib/term";
import MoonStrip from "@/components/MoonStrip";

/**
 * The sun, where it actually is.
 *
 * Everything here is arithmetic on a timestamp and a coordinate — no API, no
 * key, nothing to go stale. It updates every thirty seconds because the sun
 * moves roughly a quarter degree a minute, which is visible if you watch.
 *
 * The lower strip is the number that quietly runs the semester: daylight from
 * the first day of class to the last, with today marked. It's about three and a
 * half hours shorter in December than it was in August.
 */

/** "2026-08-17" -> "Aug 17", for the ends of the daylight strip. */
const termLabel = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC", month: "short", day: "numeric",
  });
};

const LAT = 35.1064;
const LON = -106.632;

export default function SunPanel({ term }: { term: Term }) {
  const [now, setNow] = useState<Date | null>(null);

  // Rendered client-side only: the server's clock would hydrate a different sun.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <section className="card span7">
        <div className="card-head"><h2>Sun</h2></div>
        <div className="card-body"><div className="sub">calculating…</div></div>
      </section>
    );
  }

  const p = sunPosition(LAT, LON, now);
  const dayMins = dayLengthMinutes(LAT, now);

  // --- arc geometry -------------------------------------------------------
  const W = 620, H = 210, PAD = 44;
  const baseY = H - 52;               // horizon
  const peakY = 26;                   // top of the arc
  const x0 = PAD, x1 = W - PAD;
  const cx = (x0 + x1) / 2;

  // A parabola reads more like a sun path than a circle does at this aspect.
  const arcY = (u: number) => baseY - (baseY - peakY) * (1 - Math.pow(2 * u - 1, 2));
  const arcX = (u: number) => x0 + (x1 - x0) * u;

  const path: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    path.push(`${i === 0 ? "M" : "L"}${arcX(u).toFixed(1)},${arcY(u).toFixed(1)}`);
  }
  const arcPath = path.join(" ");
  const fillPath = `${arcPath} L${x1},${baseY} L${x0},${baseY} Z`;

  const su = p.arcProgress;
  // When it's down, the clamped arc position is meaningless — sit the marker
  // just under the horizon at whichever end the sun most recently left.
  const sunX = p.isUp ? arcX(su) : arcX(su < 0.5 ? 0 : 1) + (su < 0.5 ? 26 : -26);
  const sunY = p.isUp ? arcY(su) : baseY + 15;

  // Elevation drives the wash under the arc — dawn is thin, noon is full.
  const warmth = Math.max(0, Math.min(1, p.elevation / 70));

  const fmt = (d: Date | null) =>
    !d ? "—" :
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver", hour: "numeric", minute: "2-digit",
    }).format(d);

  // Real solar events. Deriving these from `arcProgress` looked fine by day and
  // was badly wrong at night, where the progress value clamps to an endpoint.
  const ev = sunEvents(LAT, LON, now);
  const sunriseAt = ev.sunrise;
  const sunsetAt = ev.sunset;
  const minsLeft = sunsetAt
    ? Math.round((sunsetAt.getTime() - now.getTime()) / 60000)
    : 0;

  // --- term-long daylight strip -------------------------------------------
  const series = daylightSeries(LAT, term.start, term.end, 3);
  const maxD = Math.max(...series.map((s) => s.minutes));
  const minD = Math.min(...series.map((s) => s.minutes));
  const SW = 620, SH = 44;
  const sx = (i: number) => (SW * i) / (series.length - 1);
  const sy = (m: number) => SH - 6 - ((m - minD) / (maxD - minD || 1)) * (SH - 14);
  const strip = series.map((s, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(s.minutes).toFixed(1)}`).join(" ");
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  let todayIdx = series.findIndex((s) => s.iso >= todayIso);
  if (todayIdx < 0) todayIdx = series.length - 1;

  return (
    <section className="card span7">
      <div className="card-head">
        <h2>Sun and moon</h2>
        <span className="pill mono">{p.isUp ? "above the horizon" : "below the horizon"}</span>
      </div>
      <div className="card-body">
        <svg className="sunarc" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Sun ${p.elevation.toFixed(0)} degrees above the horizon, bearing ${p.azimuth.toFixed(0)} degrees`}>
          <defs>
            <linearGradient id="skyfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--heat)" stopOpacity={0.05 + warmth * 0.22} />
              <stop offset="100%" stopColor="var(--heat)" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="glow">
              <stop offset="0%" stopColor="var(--heat)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--heat)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path d={fillPath} fill="url(#skyfill)" />
          <path d={arcPath} className="sun-arc-line" />
          <line x1={0} y1={baseY} x2={W} y2={baseY} className="sun-horizon" />

          {/* Where the sun clears the horizon, and where it drops back under. */}
          {[0, 1].map((u) => (
            <circle key={u} cx={arcX(u)} cy={baseY} r={3} className="sun-tick" />
          ))}
          <line x1={cx} y1={baseY} x2={cx} y2={peakY - 6} className="sun-noon" />
          <text x={cx} y={peakY - 12} className="sun-lab mono" textAnchor="middle">solar noon</text>
          <text x={x0} y={baseY + 20} className="sun-lab mono" textAnchor="start">{fmt(sunriseAt)}</text>
          <text x={x1} y={baseY + 20} className="sun-lab mono" textAnchor="end">{fmt(sunsetAt)}</text>

          {/* No disc when it's down: the arc, the pill and the elevation fact
              all already say so, and a parked marker collides with the labels. */}
          {p.isUp && (
            <>
              <circle cx={sunX} cy={sunY} r={26} fill="url(#glow)" />
              <circle cx={sunX} cy={sunY} r={9} className="sun-disc" />
            </>
          )}

          {/* A geographer's detail: the sun's bearing, and the shadow it throws. */}
          {p.isUp && (
            <g className="sun-shadow">
              <line x1={sunX} y1={baseY} x2={sunX} y2={sunY} />
              <text x={sunX} y={baseY - 6} className="sun-lab mono" textAnchor="middle">
                {p.elevation.toFixed(0)}°
              </text>
            </g>
          )}
        </svg>

        <div className="facts mono" style={{ marginTop: 4 }}>
          <div className="fact">
            <div className="k">Elevation</div>
            <div className="v">{p.elevation.toFixed(1)}°</div>
          </div>
          <div className="fact">
            <div className="k">Azimuth</div>
            <div className="v">{p.azimuth.toFixed(0)}° {p.bearing}</div>
          </div>
          <div className="fact">
            <div className="k">Shadow falls</div>
            <div className="v">
              {["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
                [Math.round((((p.azimuth + 180) % 360)) / 22.5) % 16]}
            </div>
          </div>
          <div className="fact">
            <div className="k">Daylight left</div>
            <div className="v">
              {p.isUp && minsLeft > 0
                ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
                : "—"}
            </div>
          </div>
        </div>

        <div className="striplab mono" style={{ marginTop: 22 }}>
          Daylight across the semester
        </div>
        <svg className="daystrip" viewBox={`0 0 ${SW} ${SH}`} role="img"
          aria-label="Daylight hours from the first day of class to the last">
          <path d={`${strip} L${SW},${SH} L0,${SH} Z`} className="day-area" />
          <path d={strip} className="day-line" />
          <line x1={sx(todayIdx)} y1={0} x2={sx(todayIdx)} y2={SH} className="day-today" />
          <circle cx={sx(todayIdx)} cy={sy(series[todayIdx].minutes)} r={4} className="day-dot" />
        </svg>
        <div className="sub mono" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{termLabel(term.start)} · {(maxD / 60).toFixed(1)}h</span>
          <span style={{ color: "var(--heat)" }}>
            today · {(dayMins / 60).toFixed(1)}h
          </span>
          <span>{termLabel(term.end)} · {(minD / 60).toFixed(1)}h</span>
        </div>

        <MoonStrip />
      </div>
    </section>
  );
}
