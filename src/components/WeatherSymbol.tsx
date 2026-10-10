/** Small native vector marks; no icon package or remote image request. */
export default function WeatherSymbol({condition="",day=true}:{condition?:string|null;day?:boolean}) {
 const text=(condition||"").toLowerCase(),rain=/rain|shower|drizzle|thunder/.test(text),snow=/snow|sleet|ice/.test(text),cloud=/cloud|overcast|fog/.test(text)||rain||snow;
 return <svg className="weather-symbol" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  {day?<g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="21" cy="20" r="8" fill="currentColor" opacity=".18"/>{!cloud&&<path d="M21 3v4M21 33v4M4 20h4M34 20h4M9 8l3 3M30 29l3 3M9 32l3-3M30 11l3-3"/>}</g>:<path d="M29 9a14 14 0 1 0 9 23 13 13 0 0 1-9-23Z" fill="currentColor" opacity=".65"/>}
  {cloud&&<path d="M13 31a7 7 0 1 1 2-14 10 10 0 0 1 18 2 6 6 0 1 1 2 12Z" fill="currentColor" opacity=".75"/>}
  {rain&&<path d="m16 35-2 5m11-5-2 5m11-5-2 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>}
  {snow&&<g fill="currentColor"><circle cx="16" cy="38" r="2"/><circle cx="25" cy="40" r="2"/><circle cx="34" cy="38" r="2"/></g>}
 </svg>;
}
