import { windBearing } from "@/lib/weather-display";

/** The marker shows where the wind comes from, rather than implying a travel direction. */
export function WindCompass({ direction, calm = false }: { direction?: string | null; calm?: boolean }) {
  const bearing = windBearing(direction);
  return <svg className="weather-compass" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" opacity=".3"/>
    <path d="M50 10v9M90 50h-9M50 90v-9M10 50h9" stroke="currentColor" opacity=".5"/>
    <g fill="currentColor" fontSize="10" textAnchor="middle"><text x="50" y="8">N</text><text x="97" y="54">E</text><text x="50" y="99">S</text><text x="4" y="54">W</text></g>
    {bearing != null && !calm && <g transform={`rotate(${bearing} 50 50)`}><path d="M50 19l-6 13h12Z" fill="currentColor"/><path d="M50 37v28" stroke="currentColor" strokeWidth="2" opacity=".5"/></g>}
    <circle cx="50" cy="50" r="3" fill="currentColor"/>
  </svg>;
}

export function HumidityGauge({ value }: { value?: number | null }) {
  const percent = value == null ? null : Math.max(0, Math.min(100, value));
  return <svg className="weather-humidity-gauge" viewBox="0 0 44 44" aria-hidden="true">
    <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" opacity=".15"/>
    {percent != null && <circle cx="22" cy="22" r="18" pathLength="100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${percent} 100`} transform="rotate(-90 22 22)"/>}
    <path d="M22 12c-2 4-7 9-7 13a7 7 0 0 0 14 0c0-4-5-9-7-13Z" fill="currentColor" opacity=".65"/>
  </svg>;
}
