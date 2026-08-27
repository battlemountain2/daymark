"use client";

import { useMemo } from "react";
import type { Forecast } from "@/lib/weather";
import { TZ } from "@/lib/localtime";

/**
 * The hourly forecast, which we were fetching a summary of and throwing away.
 *
 * NWS returns about 156 hourly periods for free. The four-day card answers
 * "what's this week like"; this answers the question a student actually has,
 * which is whether it will be raining when he walks across campus at 2pm.
 */

type Hour = Forecast["hours"][number];

const hourLabel = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric" }).format(new Date(iso))
    .replace(" ", "")
    .toLowerCase();

/**
 * Plain-language precipitation timing.
 *
 * A row of percentages is data; "showers likely 4–7pm" is an answer. Finds
 * contiguous runs above a threshold and describes the first one.
 */
export function rainWindow(hours: Hour[], threshold = 30): string | null {
  const next24 = hours.slice(0, 24);
  let start = -1;
  for (let i = 0; i < next24.length; i++) {
    const wet = next24[i].precipChance >= threshold;
    if (wet && start < 0) start = i;
    if ((!wet || i === next24.length - 1) && start >= 0) {
      const end = wet ? i : i - 1;
      const a = hourLabel(next24[start].time);
      const b = hourLabel(next24[Math.min(end + 1, next24.length - 1)].time);
      const peak = Math.max(...next24.slice(start, end + 1).map((h) => h.precipChance));
      const word = peak >= 60 ? "Rain likely" : peak >= 40 ? "Showers possible" : "A chance of rain";
      return start === end ? `${word} around ${a}.` : `${word} ${a}–${b}.`;
    }
  }
  return null;
}

export default function HourStrip({ hours }: { hours: Hour[] }) {
  const show = useMemo(() => hours.slice(0, 36), [hours]);
  if (!show.length) return <div className="sub">No hourly data.</div>;

  const temps = show.map((h) => h.tempF);
  const hi = Math.max(...temps);
  const lo = Math.min(...temps);
  const span = Math.max(1, hi - lo);

  const W = show.length * 54;
  const H = 118, TOP = 22, BOT = 78;
  const x = (i: number) => i * 54 + 27;
  const y = (t: number) => BOT - ((t - lo) / span) * (BOT - TOP);
  const line = show.map((h, i) => `${x(i)},${y(h.tempF).toFixed(1)}`).join(" ");

  return (
    <div className="hourwrap">
      <svg className="hourchart" viewBox={`0 0 ${W} ${H}`} style={{ width: W }}
        role="img" aria-label={`Hourly forecast, ${lo} to ${hi} degrees`}>
        {/* Precipitation as bars from the baseline — the thing you scan for. */}
        {show.map((h, i) =>
          h.precipChance > 0 ? (
            <rect key={`p${i}`} x={x(i) - 13} y={H - 34 - (h.precipChance / 100) * 26}
              width={26} height={(h.precipChance / 100) * 26} rx={2} className="hour-precip" />
          ) : null
        )}
        <line x1={0} y1={H - 34} x2={W} y2={H - 34} className="hour-base" />
        <polyline points={line} className="hour-line" />
        {show.map((h, i) => (
          <g key={i}>
            {/* Midnight gets a divider so the days are legible. */}
            {hourLabel(h.time) === "12am" && (
              <line x1={x(i) - 27} y1={TOP - 14} x2={x(i) - 27} y2={H - 20} className="hour-day" />
            )}
            <circle cx={x(i)} cy={y(h.tempF)} r={2.5}
              className={`hour-dot${h.isDaytime ? "" : " night"}`} />
            <text x={x(i)} y={y(h.tempF) - 9} className="hour-t mono">{h.tempF}°</text>
            <text x={x(i)} y={H - 6} className="hour-h mono">{hourLabel(h.time)}</text>
            {h.precipChance >= 15 && (
              <text x={x(i)} y={H - 38 - (h.precipChance / 100) * 26} className="hour-p mono">
                {h.precipChance}%
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
