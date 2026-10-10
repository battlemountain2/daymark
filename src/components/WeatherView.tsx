"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {useEffect,useState} from "react";
import SkyBackdrop from "@/components/SkyBackdrop";
import HourStrip,{rainWindow} from "@/components/HourStrip";
import WeatherSymbol from "./WeatherSymbol";
import {dailyForecast,forecastTime,temperatureRange} from "@/lib/weather-display";
import {TZ} from "@/lib/localtime";
import type {WeatherResult} from "@/app/page";
import type {sunTimes} from "@/lib/weather";
import type {Term} from "@/lib/term";
const SunPanel=dynamic(()=>import("@/components/SunPanel"));
const Tonight=dynamic(()=>import("@/components/Tonight"));
const Orrery=dynamic(()=>import("@/components/Orrery"));
const hourLabel=(iso:string)=>new Intl.DateTimeFormat("en-US",{timeZone:TZ,hour:"numeric"}).format(new Date(iso));

export default function WeatherView({weather,sun,term}:{weather:WeatherResult;sun:ReturnType<typeof sunTimes>;term:Term}) {
 const [selected,setSelected]=useState<string|null>(null),[range,setRange]=useState(24),[astronomy,setAstronomy]=useState(false),[now,setNow]=useState<number|null>(null);
 useEffect(()=>{const tick=()=>setNow(Date.now());tick();const timer=setInterval(tick,60000);return()=>clearInterval(timer);},[]);
 const hours=(weather.hours??[]).filter(h=>now==null||Date.parse(h.time)+3600000>now),shown=hours.slice(0,range),hour=hours.find(h=>h.time===selected),currentHour=hours[0],cur=weather.current;
 const observed=!hour&&cur?.tempF!=null,forecast=hour??currentHour,temp=observed?cur.tempF:forecast?.tempF,sky=observed?cur.sky??currentHour?.shortForecast:forecast?.shortForecast;
 const wind=observed?cur.windMph:forecast?.windMph,direction=observed?cur.windDir:forecast?.windDir,humidity=observed?cur.humidity:forecast?.humidity;
 const days=dailyForecast(weather.days??[]),rain=rainWindow(hours),lows=days.flatMap(d=>d.low==null?[]:[d.low]),highs=days.flatMap(d=>d.high==null?[]:[d.high]),min=Math.min(...lows,...highs),max=Math.max(...lows,...highs);
 return <div className="wrap wx-view sky-page weather-room">
  <SkyBackdrop weather={weather} at={hour?new Date(hour.time):null} forecastHour={hour??(!observed?currentHour:undefined)}/><div className="skyscrim" aria-hidden="true"/>
  <header className="weather-room-nav"><Link href="/?space=main">Daymark</Link><span className="mono">Weather & sky</span></header>
  <div className="wxhero">
   <h1>{weather.place??"Albuquerque, NM"}</h1><div className="wxbig">{temp??"—"}<sup>°</sup></div><div className="wxsky">{sky??"Conditions unavailable"}</div>
   {!hour&&days[0]&&<p className="weather-high-low">{days[0].high!=null&&`H: ${days[0].high}°`}{days[0].high!=null&&days[0].low!=null&&' · '}{days[0].low!=null&&`L: ${days[0].low}°`}</p>}
   <p className="wx-selection-label mono" role="status">{hour?`Forecast · ${forecastTime(hour.time)}`:observed?"Current conditions":"Hourly forecast · observation unavailable"}</p>
   {hour&&<button type="button" className="weather-now" onClick={()=>setSelected(null)}>Back to now</button>}
  </div>
  {weather.error&&<p className="weather-notice" role="status">Current weather is unavailable. Sun & sky details are still here.</p>}
  <div className="weather-card-grid">
   <section className="weather-glass weather-hourly" aria-labelledby="weather-hourly-title">
    <div className="weather-card-heading"><h2 id="weather-hourly-title">Hourly forecast</h2><div className="wx-range" aria-label="Forecast range">{[24,48].map(n=><button key={n} type="button" aria-pressed={range===n} onClick={()=>{setRange(n);setSelected(null);}}>{n}h</button>)}</div></div>
    <p className="weather-forecast-summary">{rain||days[0]?.detailed||"Forecast hours in Mountain Time."}</p>
    {shown.length?<><div className="weather-hour-scroll" aria-label="Select forecast hour">{shown.map((h,i)=><button key={h.time} type="button" aria-label={`${forecastTime(h.time)}, ${h.tempF} degrees, ${h.shortForecast}, ${h.precipChance}% rain chance`} aria-pressed={selected===h.time} onClick={()=>setSelected(h.time)}><span>{i===0&&now!=null&&Date.parse(h.time)<=now?"Now":hourLabel(h.time)}</span><WeatherSymbol condition={h.shortForecast} day={h.isDaytime}/><strong>{h.tempF}°</strong><small>{h.precipChance>0?`${h.precipChance}%`:"—"}</small></button>)}</div><details className="weather-trend"><summary>Temperature & rain chart</summary><HourStrip hours={shown}/></details></>:<p>Hourly forecast unavailable.</p>}
   </section>
   <section className="weather-glass weather-week" aria-labelledby="weather-week-title"><h2 id="weather-week-title">Daily forecast</h2>{days.map(d=>{const bar=temperatureRange(d.low,d.high,min,max);return <div className="weather-day" key={d.name}><span>{d.name}</span><WeatherSymbol condition={d.shortForecast} day={d.isDaytime}/><small>{d.precipChance?`${d.precipChance}%`:""}</small><span className="weather-low">{d.low==null?"—":`${d.low}°`}</span><div className="weather-temperature-bar" aria-hidden="true">{bar&&<span style={{left:`${bar.left}%`,width:`${bar.width}%`}}/>}</div><strong>{d.high==null?"—":`${d.high}°`}</strong><span className="weather-day-description">{d.shortForecast}</span></div>;})}{!days.length&&<p>Daily forecast unavailable.</p>}</section>
   <section className="weather-glass weather-sun"><h2>Sunset</h2><strong className="weather-metric">{sun.sunset??"—"}</strong><svg className="weather-sun-arc" viewBox="0 0 300 88" aria-hidden="true"><path d="M12 72Q150-42 288 72" fill="none" stroke="currentColor" strokeWidth="2" opacity=".4"/><path d="M12 72h276" stroke="currentColor" opacity=".3"/><circle cx="288" cy="72" r="7" fill="currentColor"/></svg><p>Sunrise <strong>{sun.sunrise??"—"}</strong></p><p>{sun.daylight??"—"} of daylight</p></section>
   <section className="weather-glass"><h2>{hour?"Forecast wind":"Wind"}</h2><strong className="weather-metric">{wind==null?"—":wind}<small>{wind!=null?" mph":""}</small></strong><p>{wind===0?"Calm":direction??"Direction unavailable"}</p><div className="weather-secondary-metric"><span>Humidity</span><strong>{humidity==null?"—":`${humidity}%`}</strong></div><div className="weather-secondary-metric"><span>Rain chance</span><strong>{forecast?`${forecast.precipChance}%`:"—"}</strong></div><small>Rain chance is the hourly forecast.</small></section>
   <section className="weather-glass weather-astronomy"><div><h2>After dark</h2><p>Moon, planets & the sky overhead</p></div><button type="button" aria-expanded={astronomy} aria-controls="sky-astronomy" onClick={()=>setAstronomy(v=>!v)}>{astronomy?"Close sky details":"Explore the sky"}</button></section>
   {astronomy&&<div className="sky-astronomy" id="sky-astronomy"><SunPanel term={term}/><Tonight/><Orrery/></div>}
  </div>
  <footer className="weather-data"><span>National Weather Service · °F · Mountain Time</span>{observed&&cur.observedAt&&<span>Observed {forecastTime(cur.observedAt)}</span>}{weather.updated&&<span>Forecast updated {forecastTime(weather.updated)}</span>}</footer>
 </div>;
}
