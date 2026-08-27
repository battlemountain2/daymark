import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { getForecast, sunTimes } from "@/lib/weather";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const lat = process.env.LAT ?? "35.1064";
  const lon = process.env.LON ?? "-106.632";
  const sun = sunTimes(Number(lat), Number(lon));
  try {
    return NextResponse.json({ ...(await getForecast(lat, lon)), sun });
  } catch (e) {
    // The sun still rises even when NWS is down; return what we can compute.
    return NextResponse.json({ error: String(e), sun }, { status: 200 });
  }
}
