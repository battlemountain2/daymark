"use client";

import { useEffect, useMemo, useState } from "react";
import { solarSystem, type Body } from "@/lib/planets";

/**
 * The solar system from above, where the planets actually are.
 *
 * Same `helio()` that decides whether Jupiter is up tonight, so this and the
 * visibility list can never disagree: if Mars is drawn on the far side of the
 * Sun here, Mars really is behind the Sun.
 *
 * Radii are compressed by a power law. Linear scaling puts Mercury 78 times
 * closer to the Sun than Neptune, which on any screen means four planets in a
 * dot and four in the corners. The compression is honest about being a
 * compression — the orbit rings are labelled in AU.
 *
 * Scrub the slider and the inner planets whip round while Neptune barely
 * stirs. That ratio is the thing worth seeing, and it's very hard to feel from
 * a table of orbital periods.
 */

const COLOURS: Record<string, string> = {
  Mercury: "#9c8f84", Venus: "#d9b478", Earth: "#5b8fc9", Mars: "#c4633f",
  Jupiter: "#c9a077", Saturn: "#d8c48d", Uranus: "#8fc4c9", Neptune: "#5f7fd0",
};
const SIZES: Record<string, number> = {
  Mercury: 2.6, Venus: 4, Earth: 4.2, Mars: 3.2,
  Jupiter: 8, Saturn: 7, Uranus: 5.4, Neptune: 5.2,
};

const DAY = 86400000;

export default function Orrery() {
  const [now, setNow] = useState<Date | null>(null);
  const [offsetDays, setOffsetDays] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const when = useMemo(
    () => (now ? new Date(now.getTime() + offsetDays * DAY) : null),
    [now, offsetDays]
  );
  const bodies: Body[] = useMemo(() => (when ? solarSystem(when) : []), [when]);

  if (!when || !bodies.length) {
    return (
      <section className="card span7">
        <div className="card-head"><h2>The solar system</h2></div>
        <div className="card-body"><div className="sub">computing…</div></div>
      </section>
    );
  }

  const S = 300;                              // viewBox half-size
  const outer = Math.max(...bodies.map((b) => b.au));
  // Power-law compression: 78:1 becomes about 6:1, which fits on a screen.
  const scale = (au: number) => (Math.pow(au, 0.42) / Math.pow(outer, 0.42)) * (S - 26);

  const shown = focus ? bodies.filter((b) => b.name === focus) : bodies;
  const picked = bodies.find((b) => b.name === focus) ?? null;

  const fmtDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", month: "short", day: "numeric", year: "numeric",
  }).format(when);

  return (
    <section className="card span7">
      <div className="card-head">
        <h2>The solar system</h2>
        <span className="pill mono">{offsetDays === 0 ? "right now" : fmtDate}</span>
      </div>
      <div className="card-body">
        <svg className="orrery" viewBox={`${-S} ${-S} ${S * 2} ${S * 2}`} role="img"
          aria-label="Positions of the planets, viewed from above the ecliptic">
          {/* Orbits */}
          {bodies.map((b) => (
            <circle key={`o-${b.name}`} cx={0} cy={0} r={scale(b.au)}
              className={`orbit${focus === b.name ? " on" : ""}`} />
          ))}

          {/* The Sun */}
          <circle cx={0} cy={0} r={9} className="orrery-sun" />
          <circle cx={0} cy={0} r={20} className="orrery-glow" />

          {/* Planets. Screen y is inverted so the view matches a sky chart. */}
          {bodies.map((b) => {
            const rr = scale(b.au);
            const ang = Math.atan2(b.y, b.x);
            const x = Math.cos(ang) * rr;
            const y = -Math.sin(ang) * rr;
            const dim = focus && focus !== b.name;
            return (
              <g key={b.name} className={`orb-planet${dim ? " dim" : ""}`}
                onMouseEnter={() => setFocus(b.name)}
                onMouseLeave={() => setFocus(null)}>
                {/* A generous invisible target — Mercury is 2.6px across. */}
                <circle cx={x} cy={y} r={16} fill="transparent" style={{ cursor: "pointer" }} />
                <circle cx={x} cy={y} r={SIZES[b.name] ?? 4} fill={COLOURS[b.name] ?? "#999"} />
                {b.name === "Earth" && (
                  <circle cx={x} cy={y} r={(SIZES.Earth ?? 4) + 4} className="earthring" />
                )}
                <text x={x} y={y - (SIZES[b.name] ?? 4) - 7} className="orrery-lab mono">
                  {b.name}
                </text>
              </g>
            );
          })}
          {shown.length === 0 && null}
        </svg>

        <div className="orrery-controls">
          <input type="range" min={-1100} max={1100} step={1} value={offsetDays}
            aria-label="Move forward or back in time"
            onChange={(e) => setOffsetDays(Number(e.currentTarget.value))} />
          <div className="scrub-read mono">
            <span className="scrub-time">
              {offsetDays === 0 ? "today"
                : `${offsetDays > 0 ? "+" : "−"}${Math.abs(Math.round(offsetDays / 30.44))} months`}
            </span>
            <span className="sub">
              {picked
                ? `${picked.name} · ${picked.r.toFixed(2)} AU from the Sun · orbit ${
                    picked.years < 2 ? `${(picked.years * 12).toFixed(0)} months` : `${picked.years.toFixed(1)} years`
                  }`
                : "hover a planet · drag to move through time"}
            </span>
            {offsetDays !== 0 && (
              <button type="button" className="scrub-now" onClick={() => setOffsetDays(0)}>
                back to today
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
