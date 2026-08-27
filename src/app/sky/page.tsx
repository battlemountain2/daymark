import { redirect } from "next/navigation";
import Link from "next/link";
import { isSignedIn } from "@/lib/auth";
import { getForecast, sunTimes } from "@/lib/weather";
import WeatherView from "@/components/WeatherView";
import { getTerm } from "@/lib/get-term";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  if (!(await isSignedIn())) redirect("/login");
  const lat = process.env.LAT ?? "35.1064";
  const lon = process.env.LON ?? "-106.632";

  const term = await getTerm();
  const weather = await getForecast(lat, lon)
    .then((f) => ({ ...f, error: null as string | null }))
    .catch((e) => ({ error: String(e) } as any));

  return <WeatherView weather={weather} sun={sunTimes(Number(lat), Number(lon))} term={term} />;
}
