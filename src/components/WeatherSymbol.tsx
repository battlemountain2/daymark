/** Native vector weather marks, with distinct sun, cloud, rain and storm colors. */
export default function WeatherSymbol({ condition = "", day = true }: { condition?: string | null; day?: boolean }) {
  if (!condition) return <svg className="weather-symbol" viewBox="0 0 48 48" aria-hidden="true"><path d="M15 24h18" stroke="currentColor" strokeWidth="2"/></svg>;
  const text = condition.toLowerCase();
  const storm = /thunder|t-storm|tstm/.test(text);
  const rain = /rain|shower|drizzle/.test(text) || storm;
  const snow = /snow|sleet|ice|flurr/.test(text);
  const fog = /fog|mist|haze/.test(text);
  const cloud = /cloud|overcast/.test(text) || rain || snow || fog;
  return <svg className="weather-symbol" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    {!storm && (day ? <g stroke="#f3c86d" strokeWidth="2" strokeLinecap="round"><circle cx="21" cy="20" r="8" fill="#f3c86d"/>{!cloud && <path d="M21 3v4M21 33v4M4 20h4M34 20h4M9 8l3 3M30 29l3 3M9 32l3-3M30 11l3-3"/>}</g> : <path d="M29 9a14 14 0 1 0 9 23 13 13 0 0 1-9-23Z" fill="#c4d3e9"/>)}
    {cloud && <path d="M13 31a7 7 0 1 1 2-14 10 10 0 0 1 18 2 6 6 0 1 1 2 12Z" fill="#b7c8db"/>}
    {rain && !storm && <path d="m16 35-2 5m11-5-2 5m11-5-2 5" stroke="#84bde8" strokeWidth="2.5" strokeLinecap="round"/>}
    {storm && <path d="M24 27h9l-7 9h6L20 46l3-12h-6Z" fill="#f3c86d"/>}
    {snow && <g fill="#bbdbef"><circle cx="16" cy="38" r="2"/><circle cx="25" cy="40" r="2"/><circle cx="34" cy="38" r="2"/></g>}
    {fog && <path d="M11 36h26M15 41h20" stroke="#b7c8db" strokeWidth="2" strokeLinecap="round"/>}
  </svg>;
}
