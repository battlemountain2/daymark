"use client";

import { useEffect, useState } from "react";
import SkyScene from "@/components/SkyScene";
import { sunPosition } from "@/lib/solar";
import type { WeatherResult } from "@/app/page";
import type { Forecast } from "@/lib/weather";

/**
 * The sky, promoted from a tile to the whole page.
 *
 * Two fixed layers: the sky itself behind everything, and precipitation in
 * *front* of the content, so rain falls past your assignments rather than
 * behind them. That single ordering choice is most of what makes a weather
 * screen feel alive rather than decorated.
 *
 * It does not suspend on weather. Sun, moon and stars are pure arithmetic and
 * paint on the first frame; cloud and rain upgrade in when the forecast lands a
 * few hundred milliseconds later. Suspending would mean staring at a blank page
 * to avoid a transition nobody would notice.
 */

type Props = {
  /** Either an unresolved promise (dashboard-style) or already-resolved data. */
  weatherPromise?: Promise<WeatherResult>;
  weather?: WeatherResult | null;
  /** Scrub time, so the sky and the controls move together. */
  at?: Date | null;
  forecastHour?: Forecast["hours"][number];
};

export default function SkyBackdrop({ weatherPromise, weather = null, at = null, forecastHour }: Props) {
  const [wx, setWx] = useState<WeatherResult | null>(weather);
  const [par, setPar] = useState(0);

  useEffect(() => {
    if (!weatherPromise) return;
    let alive = true;
    // Promise.resolve, not a bare .then().catch(). A promise handed from a
    // server component to a client one arrives as a React thenable: it has
    // .then(), but .then() returns undefined, so chaining .catch() onto it
    // throws "Cannot read properties of undefined". `use()` handles thenables;
    // ordinary promise chaining does not.
    Promise.resolve(weatherPromise).then(
      (w) => { if (alive) setWx(w); },
      () => {}
    );
    return () => { alive = false; };
  }, [weatherPromise]);

  useEffect(() => { if (weather) setWx(weather); }, [weather]);

  // The whole interface follows the sky.
  //
  // Light translucent cards over a night sky give dark text a mid-grey ground
  // and terrible contrast. Rather than fighting that with opacity, the palette
  // flips when the sun goes down — which is both more readable and the thing
  // that makes the page feel like one object instead of cards on a picture.
  // Scrubbing to midnight flips it too, so the preview is honest.
  useEffect(() => {
    const apply = () => {
      const el = sunPosition(35.1064, -106.632, at ?? new Date()).elevation;
      document.documentElement.setAttribute("data-theme", el > -2 ? "light" : "dark");
    };
    apply();
    const t = setInterval(apply, 60000);
    return () => {
      clearInterval(t);
      // Hand the theme back to the system on the way out. Navigating /sky → /
      // is a client-side transition, so without this the dashboard inherits
      // whatever the sky page last decided and stays stuck there until a full
      // reload.
      document.documentElement.removeAttribute("data-theme");
    };
  }, [at]);

  useEffect(() => {
    // Parallax from scroll depth, capped so it settles rather than sliding
    // forever on a long page. rAF-throttled: scroll fires far faster than paint.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = Math.max(1, window.innerHeight * 1.4);
        setPar(Math.min(1, window.scrollY / max));
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const today = wx?.days?.find((d) => d.isDaytime) ?? wx?.days?.[0];
  const shared = {
    condition: forecastHour?.shortForecast ?? wx?.current?.sky ?? null,
    forecast: forecastHour?.shortForecast ?? today?.shortForecast ?? null,
    precipChance: forecastHour?.precipChance ?? today?.precipChance ?? null,
    at,
  };

  return (
    <>
      <div className="skybg" aria-hidden="true">
        <SkyScene {...shared} variant="backdrop" parallax={par} />
      </div>
      <div className="skyfront" aria-hidden="true">
        <SkyScene {...shared} variant="precip" />
      </div>
    </>
  );
}
