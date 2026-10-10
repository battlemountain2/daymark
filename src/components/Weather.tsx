"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SkyScene from "@/components/SkyScene";
import WeatherSymbol from "@/components/WeatherSymbol";
import { WindCompass, HumidityGauge } from "@/components/WeatherMetrics";
import { rainWindow } from "@/components/HourStrip";
import { forecastTime, weatherSnapshot } from "@/lib/weather-display";
import { TZ } from "@/lib/localtime";
import type { WeatherResult } from "@/app/page";

const hourLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric" }).format(new Date(iso));

type Props = {
  weather: WeatherResult;
  sun: { sunrise: string | null; sunset: string | null; daylight: string | null };
  renderedAt: string;
};

export default function Weather({ weather, sun, renderedAt }: Props) {
  const [now, setNow] = useState(() => Date.parse(renderedAt));
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
  const snapshot = weatherSnapshot(weather, now);
  const { hours, currentHour, period } = snapshot;
  const today = weather.days?.[0]?.isDaytime ? weather.days[0] : null;
  const tonight = weather.days?.find(d => !d.isDaytime);
  const rain = rainWindow(hours);

  return <section className="card span5 wxcard">
    <div className="card-head">
      <h2>Weather</h2>
      <Link href="/sky" className="morelink mono">Full forecast ↗</Link>
    </div>
    <div className="card-body weather-glance-body">
      {snapshot.temperature == null ? <p className="sub weather-empty">Weather is taking a moment. <Link href="/sky">Open sun &amp; sky details →</Link></p> : <>
        <div className="weather-glance-hero">
          <div className="weather-glance-sky" aria-hidden="true"><SkyScene condition={snapshot.sky} forecast={currentHour?.shortForecast} precipChance={currentHour?.precipChance ?? null} height={220}/></div>
          <div className="weather-glance-content">
            <div className="weather-glance-place">{weather.place ?? "Albuquerque, NM"}</div>
            <div className="weather-glance-temperature">{snapshot.temperature}<span>°</span></div>
            <div className="weather-glance-condition"><WeatherSymbol condition={snapshot.sky} day={currentHour?.isDaytime ?? period?.isDaytime}/><span>{snapshot.sky ?? "Conditions unavailable"}</span></div>
            <div className="weather-glance-range">{today && <span>H: {today.tempF}°</span>}{tonight && <span>L: {tonight.tempF}°</span>}<span>{snapshot.source === "observation" ? "Current conditions" : "Forecast"}</span></div>
          </div>
        </div>
        <p className="weather-glance-summary">{rain ?? period?.detailed ?? "Hourly forecast below. Times are local to Albuquerque."}</p>
        {hours.length > 0 && <div className="weather-glance-hours" role="region" aria-label="Next eight hours, temperature and precipitation chance" tabIndex={0}>
          {hours.slice(0, 8).map((h, i) => <div className="weather-glance-hour" key={h.time} role="group" aria-label={`${forecastTime(h.time)} · ${h.shortForecast}`} title={`${forecastTime(h.time)} · ${h.shortForecast}`}>
            <span>{i === 0 && Date.parse(h.time) <= now ? "Now" : hourLabel(h.time)}</span>
            <WeatherSymbol condition={h.shortForecast} day={h.isDaytime}/>
            <strong>{h.tempF}°</strong><small aria-label={h.precipChance == null ? "Precipitation chance unavailable" : `${h.precipChance}% precipitation chance`}>{h.precipChance == null ? "—" : `${h.precipChance}%`}</small>
          </div>)}
        </div>}
        <div className="weather-glance-facts">
          <div><span className="weather-fact-label">Wind</span><div className="weather-fact-reading"><WindCompass direction={snapshot.direction} calm={snapshot.wind === 0}/><strong>{snapshot.wind == null ? "—" : Math.round(snapshot.wind)}<small>{snapshot.wind != null && " mph"}</small></strong></div><small>{snapshot.wind === 0 ? "Calm" : snapshot.direction ? `From ${snapshot.direction}` : "Unavailable"}</small></div>
          <div><span className="weather-fact-label">Humidity</span><div className="weather-fact-reading"><HumidityGauge value={snapshot.humidity}/><strong>{snapshot.humidity == null ? "—" : Math.round(snapshot.humidity)}<small>{snapshot.humidity != null && "%"}</small></strong></div><small>Relative humidity</small></div>
          <div><span className="weather-fact-label">Sunset</span><div className="weather-fact-sun" aria-hidden="true">☀</div><strong className="weather-fact-time">{sun.sunset ?? "—"}</strong><small>Sunrise {sun.sunrise ?? "—"}</small></div>
        </div>
        <div className="weather-glance-source">{snapshot.observedAt ? `Observed ${forecastTime(snapshot.observedAt)}` : snapshot.observationStale ? `Observation is older · ${currentHour ? `forecast for ${forecastTime(currentHour.time)}` : "showing daily forecast"}` : currentHour ? `Forecast for ${forecastTime(currentHour.time)}` : "Showing daily forecast · observation unavailable"}<span>NWS · °F · Mountain Time</span></div>
      </>}
    </div>
  </section>;
}
