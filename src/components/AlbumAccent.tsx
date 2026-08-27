"use client";

import { useEffect } from "react";

/**
 * Tints the interface with the dominant colour of today's record sleeve.
 *
 * The covers are served from our own origin, so the canvas stays untainted and
 * `getImageData` works without CORS gymnastics.
 *
 * Two things this deliberately does not do:
 *
 * 1. It does not take the most *common* colour. Sleeves are mostly black,
 *    white or beige, and averaging gives mud every time. It buckets by hue and
 *    picks the most saturated bucket with enough weight behind it.
 * 2. It does not override the palette wholesale — only `--accent` and
 *    `--accent-soft`. Ground, ink and surface stay put, so a magenta sleeve
 *    shifts the highlights rather than repainting the page.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0))
    : max === g ? (b - r) / d + 2
    : (r - g) / d + 4;
  return [h * 60, s, l];
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;

export default function AlbumAccent({ src }: { src: string | null }) {
  useEffect(() => {
    if (!src) return;
    let cancelled = false;

    const img = new Image();
    img.decoding = "async";
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      try {
        // 48px is plenty for a dominant hue and keeps this well under a frame.
        const N = 48;
        const c = document.createElement("canvas");
        c.width = N; c.height = N;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, N, N);
        const { data } = ctx.getImageData(0, 0, N, N);

        // 24 hue buckets, weighted by saturation so a small vivid area beats a
        // large grey one.
        const buckets = new Array(24).fill(0);
        const sat = new Array(24).fill(0);
        const lum = new Array(24).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
          if (s < 0.18 || l < 0.08 || l > 0.94) continue;   // skip greys and extremes
          const b = Math.floor(h / 15) % 24;
          const w = s * s;
          buckets[b] += w; sat[b] += s * w; lum[b] += l * w;
        }

        let best = -1, bestW = 0;
        for (let i = 0; i < 24; i++) if (buckets[i] > bestW) { bestW = buckets[i]; best = i; }

        // Nothing colourful enough — leave the palette alone rather than
        // inventing a tint from noise.
        if (best < 0 || bestW < 4) return;

        const hue = best * 15 + 7.5;
        // Muted on purpose. At full saturation a red sleeve turns the page
        // into a different brand; the point is a daily shift in the accent, not
        // a repaint. Capped low enough that it reads as considered ink.
        const s = clamp(sat[best] / bestW, 0.28, 0.50);
        const l = clamp(lum[best] / bestW, 0.30, 0.44);

        const root = document.documentElement;
        // accent-soft is a tinted background, so it has to sit on the same side
        // of the page as everything else: near-white in light, near-black in
        // dark. A fixed 92% lightness disappears entirely on a dark ground.
        const dark =
          root.getAttribute("data-theme") === "dark" ||
          (root.getAttribute("data-theme") !== "light" &&
            window.matchMedia?.("(prefers-color-scheme: dark)").matches);
        root.style.setProperty("--accent", hsl(hue, s, dark ? clamp(l + 0.18, 0.45, 0.7) : l));
        root.style.setProperty(
          "--accent-soft",
          dark ? hsl(hue, clamp(s * 0.55, 0.15, 0.45), 0.14)
               : hsl(hue, clamp(s * 0.5, 0.15, 0.4), 0.92)
        );
      } catch {
        // A tainted canvas or a browser that blocks getImageData just means no
        // tint. Never worth breaking the page over.
      }
    };

    return () => {
      cancelled = true;
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--accent-soft");
    };
  }, [src]);

  return null;
}
