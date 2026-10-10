"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SkyScene from "@/components/SkyScene";
import { rainWindow } from "@/components/HourStrip";

/**
 * Weather, compacted.
 *
 * This used to be the largest thing on the dashboard — a sky, a facts grid, a
 * four-day curve, four day rows and a time scrubber, which is more space than
 * the class schedule gets. All of that still exists, on /sky, where it isn't
 * competing with what he has to do today.
 *
 * What survives here is the glance: what it's doing now, what it'll do, and
 * whether it's going to rain on him. Everything else is one click away.
 */

type Props = {
  weather: {
    place?: string;
    error?: string | null;
    current?: {
      tempF: number | null; sky: string | null; humidity: number | null;
      windMph: number | null; windDir: string | null; observedAt: string | null;
    };
    days?: Array<{
      name: string; isDaytime: boolean; tempF: number;
      shortForecast: string; detailed: string; precipChance: number | null;
    }>;
    hours?: Array<{
      time: string; tempF: number; precipChance: number; humidity: number | null;
      windMph: number | null; windDir: string | null; shortForecast: string; isDaytime: boolean;
    }>;
  };
  sun: { sunrise: string | null; sunset: string | null; daylight: string | null };
};

export default function Weather({ weather, sun }: Props) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const timer = setInterval(tick, 60000); return () => clearInterval(timer); }, []);
  const err = weather?.error;
  const days = (weather?.days ?? []).filter((d) => d.isDaytime);
  const today = weather?.days?.[0]?.isDaytime ? weather.days[0] : null;
  const tomorrow = today ? days[1] : days[0];
  const tonight = (weather?.days ?? []).find((d) => !d.isDaytime);
  const cur = weather?.current;
  const hours = weather?.hours ?? [];
  const rain = hours.length ? rainWindow(hours) : null;

  const currentHour = hours.find(h => now == null || Date.parse(h.time) + 3600000 > now);
  const walk = now == null ? null : hours.find(h => Date.parse(h.time) >= now && Date.parse(h.time) < now+6*3600000 && h.isDaytime && h.tempF>=45 && h.tempF<=85 && h.precipChance<25 && h.windMph !== null && h.windMph<15 && !/storm|thunder|snow/i.test(h.shortForecast));
  const bigTemp = cur?.tempF ?? currentHour?.tempF ?? null;
  const range = [today ? `H ${today.tempF}°` : null, tonight ? `L ${tonight.tempF}°` : null, sun.sunset ? `sunset ${sun.sunset}` : null].filter(Boolean).join(" · ");

  return (
    <section className="card span5 wxcard">
      <div className="card-head">
        <h2>Weather</h2>
        <Link href="/sky" className="morelink mono">hourly, sun &amp; sky →</Link>
      </div>
      <div className="card-body">
        {err ? (
          <div className="sub">{err}</div>
        ) : (
          <>
            <div className="wxglance">
              <div className="wxthumb">
                <SkyScene condition={cur?.sky} forecast={currentHour?.shortForecast}
                  precipChance={currentHour?.precipChance ?? null} height={92} />
              </div>
              <div className="wxnow">
                <div className="wxnow-t">
                  {bigTemp ?? "—"}<sup>°</sup>
                </div>
                <div className="wxnow-s">{cur?.sky ?? currentHour?.shortForecast ?? "—"}</div>
                <div className="sub mono wxnow-r">
                  {range}
                </div>
              </div>
            </div>

            {walk && <p className="walk-advice sub">Walk at {new Date(walk.time).toLocaleTimeString('en-US',{timeZone:'America/Denver',hour:'numeric'})} · {walk.tempF}° · {walk.precipChance}% rain</p>}
            {/* The one forecast fact that changes what he does today. */}
            <div className={`wxline${rain ? " wet" : ""}`}>
              {rain ?? `${tomorrow?.name ?? "Tomorrow"}: ${tomorrow?.shortForecast?.toLowerCase() ?? "—"}.`}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
