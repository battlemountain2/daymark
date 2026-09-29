"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import SkyBackdrop from "@/components/SkyBackdrop";
import HourStrip, { rainWindow } from "@/components/HourStrip";
import { dailyForecast, forecastTime } from "@/lib/weather-display";
import type { WeatherResult } from "@/app/page";
import type { sunTimes } from "@/lib/weather";
import type { Term } from "@/lib/term";

const SunPanel = dynamic(() => import("@/components/SunPanel"));
const Tonight = dynamic(() => import("@/components/Tonight"));
const Orrery = dynamic(() => import("@/components/Orrery"));

export default function WeatherView({ weather, sun, term }: {
  weather: WeatherResult; sun: ReturnType<typeof sunTimes>; term: Term;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState(12);
  const [astronomy, setAstronomy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const hours = (weather.hours ?? []).filter(h => now == null || Date.parse(h.time) + 3600000 > now);
  const shown = hours.slice(0, range);
  const hour = hours.find(h => h.time === selected);
  const currentHour = hours[0];
  const cur = weather.current;
  const observed = !hour && cur?.tempF != null;
  const forecast = hour ?? currentHour;
  const temp = observed ? cur.tempF : forecast?.tempF;
  const sky = observed ? cur.sky ?? currentHour?.shortForecast : forecast?.shortForecast;
  const wind = observed ? cur.windMph : forecast?.windMph;
  const direction = observed ? cur.windDir : forecast?.windDir;
  const humidity = observed ? cur.humidity : forecast?.humidity;
  const days = dailyForecast(weather.days ?? []);
  const rain = rainWindow(hours);
  const label = hour ? `Forecast · ${forecastTime(hour.time)}` : observed ? "Current observation" : "Current-hour forecast · observation unavailable";

  return <div className="wrap wx-view sky-page">
    <SkyBackdrop weather={weather} at={hour ? new Date(hour.time) : null} forecastHour={hour ?? (!observed ? currentHour : undefined)} />
    <div className="skyscrim" aria-hidden="true" />
    <div className="wxhero">
      <Link href="/" className="backlink mono">← dashboard</Link>
      <p className="wx-selection-label mono" role="status">{label}</p>
      <div className="wxbig">{temp ?? "—"}<sup>°F</sup></div>
      <div className="wxsky">{sky ?? "Conditions unavailable"}</div>
      <div className="wxsub">{weather.place ?? "Albuquerque, NM"}</div>
      <div className="wx-facts">
        <span>Wind <strong>{wind == null ? "—" : `${direction ?? ""} ${wind} mph`}</strong></span>
        <span>Humidity <strong>{humidity == null ? "—" : `${humidity}%`}</strong></span>
        <span>Rain chance <strong>{forecast ? `${forecast.precipChance}%` : "—"}</strong><small>hourly forecast</small></span>
      </div>
      {observed && cur.observedAt && <p className="wx-data-note">Observed {forecastTime(cur.observedAt)}</p>}
      {!observed && !hour && currentHour && <p className="wx-data-note">For {forecastTime(currentHour.time)}</p>}
      {weather.updated && <p className="wx-data-note">NWS forecast updated {forecastTime(weather.updated)}</p>}
    </div>

    {weather.error ? <section className="card"><div className="card-body"><p role="status">Weather is temporarily unavailable. Please try again later.</p></div></section> : <div className="grid">
      <section className="card span12 wx-hourly">
        <div className="card-head"><h2>Hour by hour</h2><div className="wx-range" aria-label="Forecast range">{[12,36].map(n => <button type="button" className="btn mono" key={n} aria-pressed={range === n} onClick={() => { setRange(n); setSelected(null); }}>{n} hours</button>)}</div></div>
        <div className="card-body">
          {rain && <p className="wxrain">{rain}</p>}
          <p className="sub">Choose an hour to preview its weather and sky. All times are Mountain Time.</p>
          {shown.length > 0 ? <>
            <div className="wx-timeline-control"><label htmlFor="forecast-hour">{hour ? forecastTime(hour.time) : "Preview forecast hours"}</label><button type="button" className="btn" onClick={() => setSelected(null)} disabled={!hour}>Back to now</button></div>
            <input className="wx-hour-slider" id="forecast-hour" type="range" min={0} max={shown.length - 1} value={Math.max(0, shown.findIndex(h => h.time === selected))} aria-valuetext={forecastTime((hour ?? shown[0]).time)} onChange={e => setSelected(shown[Number(e.target.value)].time)} />
            <div className="wx-hour-options" aria-label="Select forecast hour">{shown.map(h => <button type="button" key={h.time} aria-pressed={selected === h.time} onClick={() => setSelected(h.time)}><span>{forecastTime(h.time)}</span><strong>{h.tempF}°</strong><small>{h.precipChance}% rain</small></button>)}</div>
            {hour && <p className="wx-hour-summary" role="status"><strong>{forecastTime(hour.time)} · {hour.tempF}°F</strong><br />{hour.shortForecast} · {hour.precipChance}% rain · {hour.windMph == null ? "Wind unavailable" : `${hour.windDir ?? ""} ${hour.windMph} mph wind`}</p>}
            <details className="wx-trend"><summary>Temperature &amp; rain trend</summary><HourStrip hours={shown} /></details>
            <p className="sub">{shown.length} forecast hours shown · bars indicate chance of precipitation.</p>
          </> : <p className="sub">Hourly forecast unavailable. Daily forecasts may still be available below.</p>}
        </div>
      </section>
      <section className="card span12"><div className="card-head"><h2>The week</h2><span className="mono sub">High / low</span></div><div className="card-body wx-days">{days.map(d => <div className="wx-day-row" key={d.name}><strong>{d.name}</strong><span>{d.shortForecast}{d.precipChance != null && d.precipChance > 0 ? ` · ${d.precipChance}% rain` : ""}</span><span className="mono">{d.high == null ? "—" : `${d.high}°`} / {d.low == null ? "—" : `${d.low}°`}</span></div>)}{!days.length && <p className="sub">Daily forecast unavailable.</p>}</div></section>
      <section className="card span12"><div className="card-head"><h2>Sun &amp; night sky</h2></div><div className="card-body"><div className="wx-sun-summary"><span>Sunrise <strong>{sun.sunrise ?? "—"}</strong></span><span>Sunset <strong>{sun.sunset ?? "—"}</strong></span><span>Daylight <strong>{sun.daylight ?? "—"}</strong></span></div><button type="button" className="btn" aria-expanded={astronomy} aria-controls="sky-astronomy" onClick={() => setAstronomy(v => !v)}>{astronomy ? "Hide astronomy" : "Explore astronomy"}</button><p className="sub">Astronomy panels show today / now, independently of the forecast preview.</p></div></section>
      {astronomy && <div className="sky-astronomy" id="sky-astronomy"><SunPanel term={term} /><Tonight /><Orrery /></div>}
    </div>}
  </div>;
}
