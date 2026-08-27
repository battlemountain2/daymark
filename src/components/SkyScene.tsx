"use client";

import { useEffect, useRef } from "react";
import { sunPosition } from "@/lib/solar";
import { moonPhase, moonPosition } from "@/lib/moon";

/**
 * A sky that matches the sky.
 *
 * Reads the sun's real elevation and the actual moon phase, plus whatever the
 * forecast says is falling, and draws it: stars and a correctly-lit moon after
 * dark, rain streaks when rain is forecast, drifting cloud when it's overcast.
 *
 * Everything is procedural — no images, no requests. It costs one canvas and
 * stops entirely when the tab is hidden or the viewer asks for reduced motion.
 */

const LAT = 35.1064;
const LON = -106.632;

type Props = {
  /** Current conditions text, e.g. "Mostly Cloudy". */
  condition?: string | null;
  /** Today's forecast wording, used when there's no live observation. */
  forecast?: string | null;
  precipChance?: number | null;
  height?: number;
  /** Override "now" — the scrubber drives this. Null means follow the clock. */
  at?: Date | null;
  /**
   * "tile"     — the weather card's own sky, fixed height, draws everything.
   * "backdrop" — full-viewport page background: sky, sun, moon, stars, cloud.
   *              Precipitation is deliberately excluded so it can be drawn on
   *              top of the content instead of behind it.
   * "precip"   — transparent layer over the content, precipitation only.
   */
  variant?: "tile" | "backdrop" | "precip";
  /** 0..1 scroll progress, for parallax on the backdrop. */
  parallax?: number;
};

type Kind = "rain" | "snow" | "storm" | "none";

function readWeather(text: string): { kind: Kind; cloud: number } {
  const t = (text || "").toLowerCase();
  const kind: Kind = /thunder|t-storm|tstm/.test(t)
    ? "storm"
    : /snow|flurr|sleet|wintry/.test(t)
    ? "snow"
    : /rain|shower|drizzle/.test(t)
    ? "rain"
    : "none";
  const cloud = /overcast/.test(t) ? 1
    : /mostly cloudy/.test(t) ? 0.8
    : /partly (cloudy|sunny)|scattered/.test(t) ? 0.45
    : /few clouds|mostly (clear|sunny)/.test(t) ? 0.2
    : /clear|sunny|fair/.test(t) ? 0.05
    : 0.35;
  return { kind, cloud };
}

/** Deterministic pseudo-random so the stars don't reshuffle on every frame. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * The lit portion of the moon, drawn properly.
 *
 * The terminator is an ellipse whose width tracks the illuminated fraction:
 * it collapses to a line at the quarters and widens to the full disc at new and
 * full. Which side is dark depends on whether the moon is waxing.
 */
function drawMoon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  phase: number, lit: number, waxing: boolean, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Soft halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 3.2);
  halo.addColorStop(0, "rgba(255,248,224,0.20)");
  halo.addColorStop(1, "rgba(255,248,224,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Unlit disc, faintly visible as earthshine
  ctx.fillStyle = "rgba(224,220,205,0.13)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (lit > 0.01) {
    ctx.fillStyle = "rgba(255,250,235,0.94)";
    ctx.beginPath();
    // The always-lit limb
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing);
    // The terminator sweeping back across the disc
    const k = 2 * lit - 1;                    // -1 crescent … +1 gibbous
    ctx.ellipse(cx, cy, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0 ? !waxing : waxing);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export default function SkyScene({
  condition, forecast, precipChance, height = 128, at = null,
  variant = "tile", parallax = 0,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const parRef = useRef(parallax);
  parRef.current = parallax;
  // Held in a ref, not a dependency: re-running the effect on every drag frame
  // would rebuild the starfield and make the whole scene flicker.
  const atRef = useRef<Date | null>(at);
  atRef.current = at;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // What's happening now beats what's forecast: a 60% chance of rain this
    // afternoon shouldn't put rain on the screen while the sky is clear.
    const live = readWeather(condition ?? "");
    const ahead = readWeather(forecast ?? "");
    const cloud = condition ? live.cloud : ahead.cloud;
    const kind = live.kind !== "none" ? live.kind
      : ahead.kind !== "none" && (precipChance ?? 0) >= 40 ? ahead.kind
      : "none";
    const wet = kind !== "none";
    // It is not raining out of a clear sky. Precipitation implies cover, which
    // is what dims the stars and the moon.
    const cover = wet ? Math.max(cloud, kind === "storm" ? 0.95 : 0.85) : cloud;

    let w = 0, h = 0, dpr = 1;
    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = variant === "tile" ? height : canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const r = rng(20260821);
    const stars = Array.from({ length: 110 }, () => ({
      x: r(), y: r() * 0.82, mag: 0.35 + r() * 0.65, tw: r() * Math.PI * 2,
    }));
    // Count and size both track cover. Fading six full-width banks down to 5%
    // opacity still reads as an overcast sky; "mostly clear" should be two thin
    // wisps, not a dimmed cloud deck.
    const cloudCount = Math.max(1, Math.round(1 + cover * 5));
    const clouds = Array.from({ length: cloudCount }, (_, i) => ({
      x: i / cloudCount + r() * 0.16, y: 0.1 + r() * 0.4,
      s: (0.4 + cover * 0.75) * (0.7 + r() * 0.6),
      v: 0.008 + r() * 0.014,
    }));
    const drops = Array.from({ length: kind === "snow" ? 70 : 130 }, () => ({
      x: r(), y: r(), len: 0.06 + r() * 0.12, v: 0.7 + r() * 0.6, drift: r(),
    }));

    let raf = 0;
    let t0 = performance.now();

    const frame = (now: number) => {
      const elapsed = reduce ? 0 : (now - t0) / 1000;
      const when = atRef.current ?? new Date();
      const sun = sunPosition(LAT, LON, when);
      const moon = moonPhase(when);
      const moonPos = moonPosition(LAT, LON, when);

      // Real sky placement: azimuth left-to-right, elevation bottom-to-top.
      // East (60°) at the left edge, west (300°) at the right, so the sun
      // actually tracks the way it does outside.
      const skyX = (az: number) => Math.max(-0.1, Math.min(1.1, (az - 60) / 240)) * w;
      // In the tile, compressed into the upper band on purpose: the forecast
      // text owns the lower half, and a moon at 20° altitude drawn behind it
      // reads as a smudge. Full-screen there's no such conflict, so the horizon
      // sits where a horizon belongs and parallax drifts it as you scroll.
      const par = variant === "backdrop" ? parRef.current * h * 0.16 : 0;
      const skyY = (el: number) =>
        variant === "tile"
          ? h * (0.66 - Math.max(-6, Math.min(90, el)) / 90 * 0.58)
          : h * (0.78 - Math.max(-6, Math.min(90, el)) / 90 * 0.7) - par;

      // Two different curves. `dayness` colours the sky and starts turning at
      // sunset; `dark` gates the stars and the moon, and only opens once the
      // sun is genuinely below the horizon — civil twilight is still too bright
      // to see anything but the moon.
      const dayness = Math.max(0, Math.min(1, (sun.elevation + 6) / 18));
      const dark = Math.max(0, Math.min(1, (-sun.elevation - 3) / 12));

      ctx.clearRect(0, 0, w, h);
      if (variant === "precip") { drawPrecip(elapsed, sun.elevation); return schedule(); }

      // sky
      // Keyed off elevation directly: twilight is a band around the horizon,
      // roughly -9° to +9°, and it's much wider than the sky-colour curve is.
      const e = sun.elevation;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      const mix = (a: number[], b: number[], u: number) =>
        `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(",")})`;
      if (e > 9) {
        g.addColorStop(0, "rgb(74,132,186)");
        g.addColorStop(1, "rgb(160,196,222)");
      } else if (e > -9) {
        // Fold from daylight through sunset to night across the twilight band.
        const u = (9 - e) / 18;                       // 0 at the top, 1 at the bottom
        g.addColorStop(0, mix([74, 132, 186], [12, 16, 40], u));
        g.addColorStop(0.5, mix([150, 180, 205], [96, 62, 96], u));
        g.addColorStop(1, mix([210, 190, 160], [214, 118, 62], Math.min(1, u * 1.5)));
      } else {
        g.addColorStop(0, "rgb(9,12,30)");
        g.addColorStop(0.65, "rgb(16,22,46)");
        g.addColorStop(1, "rgb(28,34,58)");
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Overcast doesn't just add clouds, it drains the sky behind them.
      if (cover > 0.5) {
        ctx.fillStyle = e > 0 ? "rgb(122,132,142)" : "rgb(28,32,42)";
        ctx.globalAlpha = (cover - 0.5) * 1.25;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // stars — fade in as the sun goes down, dimmed by cloud
      if (dark > 0.02) {
        const vis = dark * (1 - cover * 0.85);
        for (const s of stars) {
          const twinkle = reduce ? 1 : 0.72 + 0.28 * Math.sin(elapsed * 1.6 + s.tw);
          ctx.globalAlpha = Math.max(0, s.mag * vis * twinkle);
          ctx.fillStyle = "#fdfbf4";
          const size = s.mag > 0.85 ? 1.7 : 1.1;
          ctx.fillRect(s.x * w, s.y * h, size, size);
        }
        ctx.globalAlpha = 1;
      }

      // moon, only once it's properly dark
      // The moon shows earlier than the stars do — it's visible at dusk — but
      // only when it is actually up. Half the nights of the month it isn't.
      const moonVis =
        Math.max(0, Math.min(1, (-sun.elevation + 2) / 6)) *
        (1 - cover * 0.8) *
        Math.max(0, Math.min(1, (moonPos.altitude + 1) / 4));
      if (moonVis > 0.02) {
        drawMoon(
          ctx, skyX(moonPos.azimuth), skyY(moonPos.altitude), 14,
          moon.phase, moon.illumination, moon.waxing, moonVis
        );
      }

      // The sun, where it actually is. Drawn before cloud so cloud passes over it.
      if (sun.elevation > -4) {
        const sx = skyX(sun.azimuth), sy = skyY(sun.elevation);
        // Warmer and larger near the horizon, the way it really looks.
        const low = Math.max(0, 1 - Math.max(0, sun.elevation) / 25);
        const rr = 11 + low * 7;
        const warm = `rgb(${255},${Math.round(238 - low * 70)},${Math.round(198 - low * 130)})`;

        const bloom = ctx.createRadialGradient(sx, sy, rr * 0.5, sx, sy, rr * (4 + low * 3));
        bloom.addColorStop(0, `rgba(255,236,190,${0.42 + low * 0.2})`);
        bloom.addColorStop(1, "rgba(255,236,190,0)");
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(sx, sy, rr * (4 + low * 3), 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.min(1, (sun.elevation + 4) / 3);
        ctx.fillStyle = warm;
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // cloud
      if (cover > 0.06) {
        ctx.globalAlpha = cover * (dayness > 0.4 ? 0.26 : 0.18);
        ctx.fillStyle = dayness > 0.4 ? "#eef2f6" : "#8f9aa8";
        ctx.beginPath();
        for (const c of clouds) {
          const x = (((c.x + (reduce ? 0 : elapsed * c.v)) % 1.3) - 0.15) * w;
          const y = c.y * h - (variant === "backdrop" ? parRef.current * h * 0.24 : 0);
          const rr = 22 * c.s;
          const squash = 0.42 + cover * 0.5;   // wispy when clear, puffy when overcast
          for (const [ox, oy, m] of [[-rr * 1.1, 5, 0.72], [-rr * 0.4, -3, 0.95],
                                     [rr * 0.4, 1, 1.0], [rr * 1.15, 6, 0.68]]) {
            ctx.moveTo(x + ox + rr * m, y + oy * squash);
            ctx.ellipse(x + ox, y + oy * squash, rr * m, rr * m * squash, 0, 0, Math.PI * 2);
          }
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (variant !== "backdrop") drawPrecip(elapsed, e);

      if (!reduce) raf = requestAnimationFrame(frame);
    };

    function schedule() {
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    /** Split out so the page-level layer can draw it over the content. */
    function drawPrecip(elapsed: number, e: number) {
      if (!ctx || !wet) return;
      {
        const storm = kind === "storm";
        if (kind === "snow") {
          ctx.fillStyle = e > 0 ? "rgba(252,254,255,0.92)" : "rgba(240,246,252,0.78)";
          for (const d of drops) {
            const y = ((d.y + (reduce ? 0 : elapsed * d.v * 0.32)) % 1) * h;
            const x = (d.x * w + (reduce ? 0 : Math.sin(elapsed * 0.6 + d.drift * 9) * 9));
            ctx.beginPath();
            ctx.arc(x, y, 1.5 + d.len * 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = e > 0
            ? (storm ? "rgba(58,74,102,0.55)" : "rgba(74,92,120,0.45)")
            : (storm ? "rgba(180,200,235,0.55)" : "rgba(168,192,224,0.42)");
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          for (const d of drops) {
            const speed = storm ? 3.8 : 2.6;
            const y = ((d.y + (reduce ? 0 : elapsed * d.v * speed)) % 1) * h;
            const x = d.x * w - y * 0.14;
            // The streak trails behind the drop, so it slants the way it falls.
            ctx.moveTo(x, y);
            ctx.lineTo(x - d.len * 7, y + d.len * h * 0.62);
          }
          ctx.stroke();
        }
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    // Don't animate a tab nobody is looking at.
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) {
        t0 = performance.now() - 1;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // A window-resize listener alone is not enough. The canvas is sized from
    // clientWidth at effect time; if the card hasn't been laid out yet (webfont
    // still loading, grid still resolving) that can read 0, and nothing would
    // ever redraw it without a window resize. ResizeObserver catches the element
    // getting its real width, whenever that happens.
    const ro = new ResizeObserver(() => {
      if (canvas.clientWidth > 0 && canvas.clientWidth !== w) fit();
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
    };
  }, [condition, forecast, precipChance, height]);

  // The inline height is for the tile only. Setting it on the full-screen
  // variants beat the stylesheet's height:100% and left the page-wide sky
  // 128px tall, with page background under the rest of it.
  return (
    <canvas
      ref={ref}
      className={`skyscene sky-${variant}`}
      style={variant === "tile" ? { height } : undefined}
      aria-hidden="true"
    />
  );
}
