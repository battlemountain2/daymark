import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { readState } from "@/lib/db";
import { fetchAssignments, fetchSubmissions, type Assignment, type Submission } from "@/lib/canvas";
import { getForecast, sunTimes, type Forecast } from "@/lib/weather";
import { getStories, type Story } from "@/lib/feeds";
import { getMusic, type Music } from "@/lib/music";
import { getTerm } from "@/lib/get-term";
import type { Term } from "@/lib/term";
import Dashboard from "@/components/Dashboard";

/** Always render fresh; every panel is time-sensitive. */
export const dynamic = "force-dynamic";

export type CanvasResult = {
  assignments: Assignment[];
  submissions: Submission[];
  error: string | null;
};
export type WeatherResult = (Partial<Forecast> & { error: string | null });

export default async function Page() {
  if (!(await isSignedIn())) redirect("/login");

  const lat = process.env.LAT ?? "35.1064";
  const lon = process.env.LON ?? "-106.632";

  // Deliberately NOT awaited. These are handed to the client as promises and
  // unwrapped inside Suspense boundaries, so the header, the clock and the
  // class schedule — none of which touch the network — paint immediately
  // instead of queueing behind a weather API. Each still fails on its own: a
  // dead source greys out one panel and never blanks the page.
  const weatherPromise: Promise<WeatherResult> = getForecast(lat, lon)
    .then((f) => ({ ...f, error: null }))
    .catch((e) => ({ error: String(e) }));

  const canvasPromise: Promise<CanvasResult> = (async () => {
    const ics = process.env.CANVAS_ICS_URL;
    if (!ics) return { assignments: [], submissions: [], error: "CANVAS_ICS_URL is not set" };
    try {
      const assignments = await fetchAssignments(ics);
      const submissions = await fetchSubmissions(
        process.env.CANVAS_BASE_URL ?? "https://canvas.unm.edu",
        process.env.CANVAS_API_TOKEN
      ).catch(() => []);
      return { assignments, submissions, error: null };
    } catch (e) {
      return { assignments: [], submissions: [], error: String(e) };
    }
  })();

  // Eleven feeds in parallel, cached 30 minutes. Slow ones and dead ones drop
  // out rather than holding up the panel.
  const newsPromise: Promise<Story[]> = getStories().catch(() => []);

  const musicPromise: Promise<Music> = getMusic().catch(() => ({
    source: null, user: null, recent: [], top: [], suggestions: [],
    totalScrobbles: null, error: "Music source unreachable.", note: null,
  }));

  // State is the one thing worth waiting for: it is a single fast query, and
  // rendering to-dos unticked before it lands would flash the wrong answer.
  // Both are fast and both are needed before anything renders: the schedule
  // drives the header, and getTerm falls back to the hard-coded term rather
  // than failing.
  const [state, term] = await Promise.all([
    readState().catch(() => ({ ticks: {}, dismissed: [], todos: [] })),
    getTerm(),
  ]);

  return (
    <Dashboard
      state={state}
      term={term}
      canvasPromise={canvasPromise}
      newsPromise={newsPromise}
      musicPromise={musicPromise}
      weatherPromise={weatherPromise}
      sun={sunTimes(Number(lat), Number(lon))}
      renderedAt={new Date().toISOString()}
    />
  );
}
