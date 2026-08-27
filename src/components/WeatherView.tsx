"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SkyBackdrop from "@/components/SkyBackdrop";
import HourStrip, { rainWindow } from "@/components/HourStrip";
import SunPanel from "@/components/SunPanel";
import Tonight from "@/components/Tonight";
import Orrery from "@/components/Orrery";
import { sunPosition } from "@/lib/solar";
import { atLocalMinutes, minutesIntoLocalDay, clockAt } from "@/lib/localtime";

/**
 * Weather, given the whole screen.
 *
 * The dashboard's job is one glance; this is where the detail lives — the full
 * hourly run, the sun's path, the moon. The sky here is deliberately tall,
 * because at this size it's the point rather than a background.
 */

const LAT = 35.1064;
const LON = -106.632;

export default function WeatherView({ weather, sun, term }: { weather: any; sun: any; term: import("@/lib/term").Term }) {
  // The page-wide sky belongs here, not on the dashboard.
  const [at, setAt] = useState<Date | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNowMin(minutesIntoLocalDay(new Date()));
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  const err = weather?.error;
  const cur = weather?.current;
  const days = (weather?.days ?? []).filter((d: any) => d.isDaytime).slice(0, 5);
  const today = days[0];
  const hours = weather?.hours ?? [];
  const rain = hours.length ? rainWindow(hours) : null;

  const scrub = at == null ? null : minutesIntoLocalDay(at);
  const shownMin = scrub ?? nowMin;
  const shownElev = shownMin == null ? null
    : sunPosition(LAT, LON, atLocalMinutes(new Date(), shownMin)).elevation;

  return (
    <div className="wrap wx-view sky-page">
      <SkyBackdrop weather={weather} at={at} />
      <div className="skyscrim" aria-hidden="true" />

      <div className="wxhero">
        <Link href="/" className="backlink mono">← dashboard</Link>
        <div className="wxbig">
          {cur?.tempF ?? today?.tempF ?? "—"}<sup>°F</sup>
        </div>
        <div className="wxsky">{cur?.sky ?? today?.shortForecast ?? "—"}</div>
        <div className="wxsub">
          {weather?.place ?? "Albuquerque, NM"}
          {today ? ` · high ${today.tempF}°` : ""}
          {rain ? ` · ${rain}` : ""}
        </div>
      </div>

      {err ? (
        <section className="card span12"><div className="card-body"><div className="sub">{err}</div></div></section>
      ) : (
        <>
          {nowMin != null && (
            <div className={`scrub wxscrub${scrub != null ? " on" : ""}`}>
              <input type="range" min={0} max={1439} step={1} value={shownMin ?? 0}
                aria-label="Preview the sky at a different time of day"
                onChange={(e) => setAt(atLocalMinutes(new Date(), Number(e.currentTarget.value)))} />
              <div className="scrub-read mono">
                <span className="scrub-time">{clockAt(atLocalMinutes(new Date(), shownMin ?? 0))}</span>
                <span className="sub">{shownElev == null ? "" : `sun ${shownElev.toFixed(0)}°`}</span>
                {scrub != null && (
                  <button type="button" className="scrub-now" onClick={() => setAt(null)}>back to now</button>
                )}
              </div>
            </div>
          )}

          <div className="grid">
            <section className="card span12">
              <div className="card-head">
                <h2>Next 36 hours</h2>
                <span className="pill mono live">{hours.length} hours available</span>
              </div>
              <div className="card-body">
                {rain && <div className="wxrain">{rain}</div>}
                <HourStrip hours={hours} />
                <div className="sub mono" style={{ fontSize: 10.5, marginTop: 8 }}>
                  Scroll sideways · bars are chance of precipitation
                </div>
              </div>
            </section>

            <SunPanel term={term} />

            <Tonight />

            <Orrery />

            <section className="card span5">
              <div className="card-head"><h2>The week</h2></div>
              <div className="card-body">
                {days.map((d: any) => (
                  <div className="day" key={d.name}>
                    <div className="name mono">{d.name.slice(0, 3).toLowerCase()}</div>
                    <div className="desc">
                      <b>{d.shortForecast}.</b>
                      {d.precipChance ? <span className="tag storm mono">{d.precipChance}%</span> : null}
                    </div>
                    <div className="hi mono">{d.tempF}°</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
