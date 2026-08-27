"use client";

import { useEffect, useState } from "react";
import { moonPhase, moonPosition, moonTimes, nextPhases } from "@/lib/moon";
import { localMidnightUtcMs, clockAt } from "@/lib/localtime";

/**
 * The moon, in numbers.
 *
 * Phase drawn from the real illuminated fraction, plus where it is right now
 * and when it rises and sets today. Like the solar panel, all arithmetic —
 * nothing to fetch, nothing to expire.
 *
 * A calendar day genuinely can have no moonrise or no moonset, because the moon
 * comes up about fifty minutes later each day. Both are rendered as "—" when
 * that happens rather than being faked from the neighbouring day.
 */

const LAT = 35.1064;
const LON = -106.632;
const TZ = "America/Denver";

/** The same terminator geometry the sky scene uses, as a clip-free SVG path. */
function moonPath(r: number, lit: number, waxing: boolean): string {
  const k = 2 * lit - 1;
  const rx = Math.abs(k) * r;
  // Outer limb (a half circle), then the terminator ellipse back to the start.
  const sweepLimb = waxing ? 1 : 0;
  const sweepTerm = k > 0 ? sweepLimb : 1 - sweepLimb;
  return [
    `M 0 ${-r}`,
    `A ${r} ${r} 0 0 ${sweepLimb} 0 ${r}`,
    `A ${rx} ${r} 0 0 ${sweepTerm} 0 ${-r}`,
    "Z",
  ].join(" ");
}

export default function MoonStrip() {
  const [now, setNow] = useState<Date | null>(null);

  // Client-only: the server's clock would hydrate a different moon.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className="sub">calculating…</div>;

  const m = moonPhase(now);
  const pos = moonPosition(LAT, LON, now);
  const next = nextPhases(now);

  const times = moonTimes(LAT, LON, localMidnightUtcMs(now));

  const clock = (d: Date | null) => clockAt(d, TZ);

  const soonest = next.toFull < next.toNew
    ? { label: "Full moon", days: next.toFull }
    : { label: "New moon", days: next.toNew };
  const inDays = soonest.days < 1
    ? "tonight"
    : `in ${Math.round(soonest.days)} day${Math.round(soonest.days) === 1 ? "" : "s"}`;

  return (
    <div className="moonrow">
      <svg className="moonface" viewBox="-26 -26 52 52" role="img"
        aria-label={`${m.name}, ${Math.round(m.illumination * 100)} percent illuminated`}>
        <circle r="22" className="moon-dark" />
        {m.illumination > 0.01 && <path d={moonPath(22, m.illumination, m.waxing)} className="moon-lit" />}
        <circle r="22" className="moon-rim" />
      </svg>

      <div className="moonfacts">
        <div className="moonname">{m.name}</div>
        <div className="sub mono">
          {Math.round(m.illumination * 100)}% lit · {soonest.label.toLowerCase()} {inDays}
        </div>
      </div>

      <div className="facts mono moonnums">
        <div className="fact">
          <div className="k">Moonrise</div>
          <div className="v">{clock(times.rise)}</div>
        </div>
        <div className="fact">
          <div className="k">Moonset</div>
          <div className="v">{clock(times.set)}</div>
        </div>
        <div className="fact">
          <div className="k">Right now</div>
          <div className="v">
            {pos.isUp ? `${pos.altitude.toFixed(0)}° ${pos.bearing}` : "below horizon"}
          </div>
        </div>
      </div>
    </div>
  );
}
