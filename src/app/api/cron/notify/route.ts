import { NextResponse } from "next/server";
import { readState, claimSend, lastDetail, recordDetail } from "@/lib/db";
import { fetchAssignments } from "@/lib/canvas";
import { getForecast, type Forecast } from "@/lib/weather";
import { localParts } from "@/lib/schedule";
import { due, describeChange, assignmentFingerprint, weatherException } from "@/lib/notify";
import { sendToAll } from "@/lib/push";
import { getTerm } from "@/lib/get-term";

/**
 * The endpoint an external scheduler pokes every quarter hour.
 *
 * It is external because Vercel's Hobby plan caps cron jobs at **once per day**
 * with ±59 minutes of slop — fine for the nightly brief, useless for "an hour
 * before your first class", which moves with the timetable. A free pinger
 * (GitHub Actions, cron-job.org) hitting this every 15 minutes costs nothing
 * and gives real precision.
 *
 * Being externally callable, it must be authenticated: without `CRON_SECRET`
 * anyone who found the URL could make the phone buzz. The secret is compared in
 * constant time and only ever arrives in a header — a query string would end up
 * in access logs.
 *
 * Idempotence is the database's job, not the window's. `claimSend` inserts a
 * (kind, day) row and reports whether it won; every later poll inside the same
 * window loses and sends nothing. That is what lets the windows in
 * `notify.ts` be hours wide without producing hours of buzzing.
 */

export const dynamic = "force-dynamic";

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!timingSafeEqual(token, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // A test send, so setup can be verified without waiting for 7am. It ignores
  // the time windows and the once-a-day claim, and is gated by the same secret.
  if (new URL(req.url).searchParams.get("test") === "1") {
    try {
      const r = await sendToAll({
        title: "Notifications are on",
        body: "This is a test. Real ones arrive at 7am, an hour before your first class, and at 9pm.",
        url: "/",
      });
      return NextResponse.json({ ok: true, test: true, ...r });
    } catch (e) {
      return NextResponse.json(
        { ok: false, test: true, error: String(e instanceof Error ? e.message : e) },
        { status: 500 }
      );
    }
  }

  const now = new Date();
  const p = localParts(now);

  // Every source is optional. A dead forecast should not stop the class nudge.
  const [term, state, assignments, weather] = await Promise.all([
    getTerm(),
    readState().catch(() => ({ ticks: {}, dismissed: [], todos: [] })),
    (async () => {
      const ics = process.env.CANVAS_ICS_URL;
      if (!ics) return [];
      return fetchAssignments(ics).catch(() => []);
    })(),
    getForecast(process.env.LAT ?? "35.1064", process.env.LON ?? "-106.632")
      .catch(() => null) as Promise<Forecast | null>,
  ]);

  const queue = due({ now, term, weather, assignments, state });

  // Canvas changes: compare against the last fingerprint. The first ever run
  // records a baseline silently rather than announcing every assignment at once.
  const seen = await lastDetail("canvas-change").catch(() => null);
  if (!seen) {
    await recordDetail("canvas-change", p.iso, assignmentFingerprint(assignments)).catch(() => {});
  } else {
    const change = describeChange(seen, assignments, p.iso);
    if (change) queue.push(change);
  }

  // Weather exceptions, checked once in the morning so it doesn't interrupt
  // the evening with something already lived through.
  if (p.minutes >= 420 && p.minutes < 540) {
    const wx = weatherException(weather, p.iso);
    if (wx) queue.push(wx);
  }

  const results: Array<{ kind: string; sent: boolean; detail?: string }> = [];
  for (const note of queue) {
    const won = await claimSend(note.kind, p.iso, note.detail ?? "");
    if (!won) {
      results.push({ kind: note.kind, sent: false, detail: "already sent today" });
      continue;
    }
    try {
      const r = await sendToAll({ title: note.title, body: note.body, url: "/" });
      if (note.detail) await recordDetail(note.kind, p.iso, note.detail).catch(() => {});
      results.push({ kind: note.kind, sent: true, detail: `${r.sent} device(s), ${r.pruned} pruned` });
    } catch (e) {
      results.push({ kind: note.kind, sent: false, detail: String(e instanceof Error ? e.message : e) });
    }
  }

  return NextResponse.json({
    ok: true,
    localTime: `${p.iso} ${String(Math.floor(p.minutes / 60)).padStart(2, "0")}:${String(p.minutes % 60).padStart(2, "0")}`,
    considered: queue.length,
    results,
  });
}
