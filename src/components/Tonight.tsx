"use client";

import { useEffect, useState } from "react";
import { visibleTonight, type SkyObject } from "@/lib/planets";
import { sunPosition, sunEvents } from "@/lib/solar";
import { moonPhase, moonPosition } from "@/lib/moon";
import { clockAt } from "@/lib/localtime";

/**
 * What is actually overhead, right now, from Albuquerque.
 *
 * Not decoration: real Keplerian planet positions and a bright-star catalogue,
 * the same offline arithmetic as the sun and moon panels. Verified against two
 * independent invariants before shipping — Polaris sits at your latitude to
 * within its own 0.74° offset from the pole, and every planet's magnitude range
 * over four years matches the published one.
 *
 * By day it says so rather than pretending: these objects are above the horizon
 * at noon too, you simply can't see them.
 */

const LAT = 35.1064;
const LON = -106.632;

/** Rough naked-eye ordering. Albuquerque has real light pollution. */
const brightnessLabel = (m: number): string =>
  m < -2 ? "unmistakable" : m < 0 ? "very bright" : m < 1.5 ? "bright" : "visible";

export default function Tonight() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <section className="card span5">
        <div className="card-head"><h2>Tonight&apos;s sky</h2></div>
        <div className="card-body"><div className="sub">computing…</div></div>
      </section>
    );
  }

  const sun = sunPosition(LAT, LON, now);
  const dark = sun.elevation < -6;
  const ev = sunEvents(LAT, LON, now);
  const moon = moonPhase(now);
  const moonPos = moonPosition(LAT, LON, now);

  const up = visibleTonight(LAT, LON, now).slice(0, 7);
  const planets = up.filter((o) => o.kind === "planet");

  return (
    <section className="card span5">
      <div className="card-head">
        <h2>Tonight&apos;s sky</h2>
        <span className={`pill mono ${dark ? "live" : ""}`}>
          {dark ? `${up.length} up now` : `dark at ${clockAt(ev.sunset)}`}
        </span>
      </div>
      <div className="card-body">
        {!dark && (
          <div className="sub" style={{ marginBottom: 14 }}>
            These are above the horizon right now — the sky is just too bright to
            see them. {planets.length > 0 && `${planets[0].name} is up.`}
          </div>
        )}

        <div className="skylist">
          {moonPos.isUp && (
            <div className="skyrow">
              <div className="sky-alt mono">{moonPos.altitude.toFixed(0)}°</div>
              <div>
                <div className="sky-name">The moon</div>
                <div className="sub mono">
                  {moon.name.toLowerCase()} · {Math.round(moon.illumination * 100)}% lit
                </div>
              </div>
              <div className="sky-dir mono">{moonPos.bearing}</div>
            </div>
          )}

          {up.map((o: SkyObject) => (
            <div className="skyrow" key={o.name}>
              <div className="sky-alt mono">{o.altitude.toFixed(0)}°</div>
              <div>
                <div className="sky-name">
                  {o.name}
                  {o.kind === "planet" && <span className="tag mono planet">planet</span>}
                </div>
                <div className="sub mono">
                  mag {o.magnitude.toFixed(1)} · {brightnessLabel(o.magnitude)}
                  {o.distanceAu != null && ` · ${o.distanceAu.toFixed(1)} AU`}
                </div>
              </div>
              <div className="sky-dir mono">{o.bearing}</div>
            </div>
          ))}

          {!up.length && (
            <div className="sub">Nothing bright above the horizon at the moment.</div>
          )}
        </div>

        <div className="sub mono" style={{ marginTop: 14, fontSize: 10.5 }}>
          Altitude above the horizon · compass bearing to look
        </div>
      </div>
    </section>
  );
}
