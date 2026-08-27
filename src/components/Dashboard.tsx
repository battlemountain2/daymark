"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useMemo, useState } from "react";
import type { State } from "@/lib/db";
import type { CanvasResult, WeatherResult } from "@/app/page";
import Weather from "@/components/Weather";
import TodoPanel, { TodoSkeleton, buildItems } from "@/components/TodoPanel";
import Offline from "@/components/Offline";
import PushToggle from "@/components/PushToggle";
import { applyLocal, TEMP_PREFIX } from "@/lib/apply";
import { enqueue, flush, cancelQueuedAdd } from "@/lib/outbox";
import NewsPanel, { NewsSkeleton } from "@/components/NewsPanel";
import Milestones, { MilestonesSkeleton } from "@/components/Milestones";
import type { Story } from "@/lib/feeds";
import type { Music } from "@/lib/music";
import MusicPanel, { MusicSkeleton } from "@/components/MusicPanel";
import {
  classesOn, gaps, hhmm, localParts, leaveAdvice, building, type ClassBlock,
} from "@/lib/schedule";
import type { Term } from "@/lib/term";
import { daysBetween, longDate } from "@/lib/localtime";
import { lede, type Lede, type LedeInputs, type LedeItem, type Tone } from "@/lib/lede";
import CommandPalette, { type Command } from "@/components/CommandPalette";

type Props = {
  state: State;
  term: Term;
  canvasPromise: Promise<CanvasResult>;
  newsPromise: Promise<Story[]>;
  musicPromise: Promise<Music>;
  weatherPromise: Promise<WeatherResult>;
  sun: { sunrise: string | null; sunset: string | null; daylight: string | null };
  renderedAt: string;
};

/**
 * The lede, and the three-stage stream that fills it in.
 *
 * `lede()` is a pure function of (clock, term, classes, work, weather) and the
 * first two of those need no network at all — so the schedule-only answer can
 * render in the first paint and is *already correct* for most of the ladder.
 * Canvas upgrades it, weather adds at most a trailing clause and can never
 * change the headline. Nesting the boundaries this way means the top of the
 * page is never blank and never waits on the slowest source; in the ordinary
 * cached case nothing visibly changes at all.
 */
const KICKER: Record<Tone, string> = {
  go: "Time to go",
  class: "In class",
  due: "Due today",
  soon: "Coming up",
  clear: "Clear",
};

function LedeView({ l, greeting }: { l: Lede; greeting: string }) {
  return (
    <div className="ledeblock" data-tone={l.tone}>
      <div className="kicker mono">
        <span className="kdot" aria-hidden="true" />
        {KICKER[l.tone]}
        <span className="kgreet">{greeting}, Brayan</span>
      </div>
      <h1 className="lede">{l.lead}</h1>
      {l.sub && <p className="ledesub">{l.sub}</p>}
    </div>
  );
}

type LedeBase = Omit<LedeInputs, "items" | "weather">;

function LedeWithWeather({
  base, items, promise, greeting,
}: { base: LedeBase; items: LedeItem[]; promise: Promise<WeatherResult>; greeting: string }) {
  const w = use(promise);
  const today = w?.days?.find((d) => d.isDaytime) ?? w?.days?.[0];
  const weather =
    w?.current?.tempF != null
      ? { tempF: w.current.tempF, sky: w.current.sky ?? null, precipChance: today?.precipChance ?? null }
      : today
        ? { tempF: today.tempF, sky: today.shortForecast ?? null, precipChance: today.precipChance ?? null }
        : null;
  return <LedeView greeting={greeting} l={lede({ ...base, items, weather })} />;
}

function LedeWithCanvas({
  base, st, canvasPromise, weatherPromise, greeting,
}: {
  base: LedeBase; st: State;
  canvasPromise: Promise<CanvasResult>; weatherPromise: Promise<WeatherResult>; greeting: string;
}) {
  const c = use(canvasPromise);
  const items = buildItems(c.assignments, st);
  return (
    <Suspense fallback={<LedeView greeting={greeting} l={lede({ ...base, items, weather: null })} />}>
      <LedeWithWeather base={base} items={items} promise={weatherPromise} greeting={greeting} />
    </Suspense>
  );
}

function WeatherSlot({
  promise, sun,
}: { promise: Promise<WeatherResult>; sun: Props["sun"] }) {
  return <Weather weather={use(promise)} sun={sun} />;
}

/** Same footprint as the real card, so the grid doesn't jump when it lands. */
function WeatherSkeleton() {
  return (
    <section className="card span5 wxcard">
      <div className="card-head"><h2>Weather</h2><span className="pill mono">loading</span></div>
      <div className="card-body">
        <div className="wxglance">
          <div className="wxthumb skel-sky" style={{ height: 92 }} />
          <div className="wxnow">
            <span className="bar" style={{ width: 92, height: 30 }} />
            <span className="bar" style={{ width: 118 }} />
            <span className="bar sm" style={{ width: 150 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

const fmtTime = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/**
 * Scroll to a card by the text of its heading.
 *
 * Matching on rendered text rather than an id looks fragile and is in fact the
 * sturdier option here: the alternative is threading an id prop through seven
 * components that don't otherwise need one, and a heading that gets renamed
 * without updating this simply fails to scroll — which is visible immediately,
 * unlike a stale id that silently matches nothing.
 */
function jumpToCard(heading: string) {
  const h = Array.from(document.querySelectorAll<HTMLElement>(".card-head h2"))
    .find((el) => el.textContent?.trim().toLowerCase() === heading.toLowerCase());
  const card = h?.closest("section");
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Dashboard({
  state, term, canvasPromise, newsPromise, musicPromise, weatherPromise, sun, renderedAt,
}: Props) {
  const router = useRouter();
  const [st, setSt] = useState<State>(state);
  const [now, setNow] = useState(() => localParts());
  // Rendered only after mount. The server stamps one time into the HTML and the
  // browser hydrates at another, which is a guaranteed text mismatch — and when
  // the page is served from the offline cache the gap can be days. React
  // error #418 was exactly this.
  const [clock, setClock] = useState<{ date: string; time: string } | null>(null);
  const [palette, setPalette] = useState("forest");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);

  // The clock, the countdowns and "is this class over" all move on their own.
  useEffect(() => {
    const tick = () => {
      setNow(localParts());
      const d = new Date();
      setClock({
        date: d.toLocaleDateString("en-US", {
          timeZone: "America/Denver", weekday: "long", month: "long",
          day: "numeric", year: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          timeZone: "America/Denver", hour: "numeric", minute: "2-digit",
        }),
      });
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try { setPalette(localStorage.getItem("hb:pal") || "forest"); } catch {}
  }, []);

  /**
   * The assignment list, mirrored into state for the command palette.
   *
   * The panels get this by suspending on the promise, but the palette must be
   * usable the instant the page appears — it cannot sit behind a Suspense
   * boundary. So it reads the same promise here and simply has no assignment
   * commands until Canvas lands.
   *
   * `Promise.resolve` matters: what a server component hands down is a
   * *thenable*, not a Promise, and its `.then()` returns undefined — chaining
   * `.catch()` straight onto it throws.
   */
  const [work, setWork] = useState<ReturnType<typeof buildItems> | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.resolve(canvasPromise).then(
      (c) => { if (alive) setWork(buildItems(c.assignments, st)); },
      () => { if (alive) setWork([]); }
    );
    return () => { alive = false; };
  }, [canvasPromise, st]);

  function applyPalette(p: string) {
    setPalette(p);
    if (p === "forest") document.documentElement.removeAttribute("data-palette");
    else document.documentElement.setAttribute("data-palette", p);
    try { localStorage.setItem("hb:pal", p); } catch {}
  }

  /**
   * Every mutation round-trips to the server, so a tick on the phone shows up
   * on the laptop — but it applies locally first, so it registers instantly and
   * still registers with no signal at all.
   *
   * A write that silently vanishes is worse than one that visibly fails, which
   * is exactly what the offline work created before this existed: the page
   * loaded fine underground and every tick was thrown away.
   */
  async function mutate(body: Record<string, unknown>) {
    // A locally-created to-do needs an id now; the server issues the real one
    // when this replays, and the state it returns supersedes this.
    // The client mints the id so that a replay after a lost response is a
    // no-op on the server instead of a second identical to-do.
    const withId =
      body.action === "addTodo"
        ? {
            ...body,
            id: `${TEMP_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          }
        : body;

    setSt((prev) => applyLocal(prev, withId));

    // Deleting a to-do that never reached the server: cancel its creation
    // rather than sending a delete for an id the server has never seen, which
    // would no-op and then let the queued create resurrect it.
    if (body.action === "deleteTodo" && String(body.id ?? "").startsWith(TEMP_PREFIX)) {
      try {
        if (await cancelQueuedAdd(String(body.id))) {
          setPending((n) => Math.max(0, n - 1));
          return;
        }
      } catch {
        // No IndexedDB — fall through and let the server reject it harmlessly.
      }
    }

    setBusy(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withId),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      if (json?.state) setSt(json.state);
    } catch {
      // Offline, or the server is unreachable. Keep it and replay later.
      try {
        await enqueue(withId);
        setPending((n) => n + 1);
      } catch {
        // No IndexedDB (private window, quota). The optimistic edit stands for
        // this session but will not survive a reload — nothing better to do.
      }
    } finally {
      setBusy(false);
    }
  }

  /**
   * Replay the outbox. iOS Safari has no Background Sync, so this is driven
   * from the page: on load, when the network returns, when the tab regains
   * focus, and on a slow interval as a backstop.
   */
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await flush();
        if (!alive) return;
        if (r.state) setSt(r.state as State);
        setPending(r.left);
      } catch {
        // IndexedDB unavailable; nothing queued, nothing to do.
      }
    };
    run();
    const onOnline = () => run();
    const onFocus = () => { if (!document.hidden) run(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onFocus);
    const t = setInterval(run, 60000);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const todayClasses: ClassBlock[] = classesOn(term, now.iso, now.dow);
  const openBlocks = gaps(todayClasses);
  const leave = leaveAdvice(todayClasses, now.minutes);

  const greeting = now.minutes < 720 ? "Morning" : now.minutes < 1020 ? "Afternoon" : "Evening";

  // Everything the lede needs that costs nothing to compute.
  const ledeBase = { now, term, classes: todayClasses };

  const commands: Command[] = useMemo(() => {
    const out: Command[] = [
      { id: "go-sky", group: "Go", label: "Sky, sun and weather", hint: "/sky",
        keywords: "moon stars planets forecast orrery tonight",
        run: () => router.push("/sky") },
      { id: "go-term", group: "Go", label: "Edit the term and schedule", hint: "/term",
        keywords: "classes courses breaks semester dates",
        run: () => router.push("/term") },
    ];

    for (const h of ["Weather", "Day at a glance", "Due", "Semester", "What's new", "Music"]) {
      out.push({
        id: `jump-${h}`, group: "Jump to", label: h, hint: "scroll",
        run: () => jumpToCard(h),
      });
    }

    // Open work, soonest first. Capped: a palette listing forty assignments is
    // a list, and the point of this is to skip lists.
    for (const it of (work ?? [])
      .filter((i) => !i.done && daysBetween(now.iso, i.due) >= -14)
      .sort((a, b) => (a.due < b.due ? -1 : 1))
      .slice(0, 12)) {
      const d = daysBetween(now.iso, it.due);
      out.push({
        id: `tick-${it.id}`,
        group: "Tick off",
        label: it.title,
        keywords: it.code,
        hint: d < 0 ? `${-d}d overdue` : d === 0 ? "due today" : d === 1 ? "tomorrow" : `${d}d`,
        run: () => mutate(it.mine
          ? { action: "todoDone", id: it.id, done: true }
          : { action: "tick", key: it.id, done: true }),
      });
    }

    for (const p of ["forest", "dusk", "ash"]) {
      out.push({
        id: `pal-${p}`, group: "Theme", label: `Switch to ${p}`,
        hint: palette === p ? "current" : undefined,
        keywords: "palette colour color",
        run: () => applyPalette(p),
      });
    }
    return out;
  }, [work, now.iso, palette, router]);        // eslint-disable-line react-hooks/exhaustive-deps

  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.dow];
  const emptyWhy =
    now.iso < term.start ? `${term.name} starts ${longDate(term.start)}.`
    : now.iso > term.end ? `${term.name} is over.`
    : term.breaks.includes(now.iso) ? "Break — no classes today."
    : `No classes on ${dayName}s this term.`;

  return (
    <div className="wrap">
      <Offline renderedAt={renderedAt} pending={pending} />
      <header>
        <Suspense
          fallback={
            <LedeView greeting={greeting}
              l={lede({ ...ledeBase, items: null, weather: null })} />
          }>
          <LedeWithCanvas base={ledeBase} st={st} greeting={greeting}
            canvasPromise={canvasPromise} weatherPromise={weatherPromise} />
        </Suspense>
        <div className="stamp mono">
          <span>{clock?.date ?? "\u00a0"}</span>
          <span>{clock?.time ?? "\u00a0"}</span>
          <Link href="/term" className="morelink mono">edit term</Link>
          <CommandPalette commands={commands} onCapture={(title) =>
            mutate({ action: "addTodo", title, due: now.iso })} />
          <span className="themes">
            {["forest", "dusk", "ash"].map((p) => (
              <button key={p} type="button" className="mono"
                aria-pressed={palette === p} onClick={() => applyPalette(p)}>{p}</button>
            ))}
          </span>
        </div>
      </header>
      <div className="rule" />

      <div className="grid">
        <Suspense fallback={<WeatherSkeleton />}>
          <WeatherSlot promise={weatherPromise} sun={sun} />
        </Suspense>

        <section className="card span7">
          <div className="card-head"><h2>Day at a glance</h2></div>
          <div className="card-body">
            <div>
              {!todayClasses.length && (
                <div className="sub" style={{ padding: "18px 0" }}>{emptyWhy}</div>
              )}
              {todayClasses.map((c, i) => (
                <div key={`${c.code}-${i}`}>
                  {openBlocks.some((g) => g.afterIndex === i - 1) && (() => {
                    const g = openBlocks.find((x) => x.afterIndex === i - 1)!;
                    const h = Math.floor(g.minutes / 60), m = g.minutes % 60;
                    return (
                      <div className="gap">
                        <div className="gline" />
                        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                          {h ? `${h}h ` : ""}{m ? `${m}m` : ""}
                        </div>
                        <div className="gtxt">
                          open block — {fmtTime(hhmm(g.from))} to {fmtTime(hhmm(g.to))}
                        </div>
                      </div>
                    );
                  })()}
                  <div className={`cls ${c.ck}${hhmm(c.end) <= now.minutes ? " past" : ""}`}>
                    <div className="stripe" />
                    <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                      {fmtTime(hhmm(c.start))}<br />{fmtTime(hhmm(c.end))}
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{c.code}</div>
                      <div className="title">{c.title}</div>
                      <div className="sub">{c.where}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {leave && (
              <div className="callout">
                <div className="k mono">Before you leave</div>
                <div className="v">
                  Head out by {fmtTime(leave.leaveAtMinutes)} for {leave.next.code}
                </div>
                <div className="s">
                  {leave.next.where}
                  {leave.hop && ` · Tight hop — ${leave.hop.from} to ${leave.hop.to} with ${leave.hop.gap} minutes between.`}
                </div>
              </div>
            )}
          </div>
        </section>

        <Suspense fallback={<TodoSkeleton />}>
          <TodoPanel promise={canvasPromise} st={st} busy={busy}
            nowIso={now.iso} mutate={mutate} />
        </Suspense>

        <Suspense fallback={<MusicSkeleton />}>
          <MusicPanel promise={musicPromise} />
        </Suspense>

        <Suspense fallback={<MilestonesSkeleton />}>
          <Milestones term={term} promise={canvasPromise} st={st} />
        </Suspense>

        <Suspense fallback={<NewsSkeleton />}>
          <NewsPanel promise={newsPromise} st={st} mutate={mutate} />
        </Suspense>

      </div>

      <PushToggle />

      <footer>
        Assignments come from your Canvas calendar feed, and your ticks live in a database — so
        checking something off on your phone shows up on your laptop, and an edit made with no
        signal is queued and synced when you reconnect. Weather is api.weather.gov: free, keyless,
        current. Class times, open blocks, countdowns, sunrise, sunset, the moon and the planets are
        all computed here rather than fetched, skipping fall break (Oct 8&ndash;9) and ending
        Dec 12. Listening comes from Last.fm. Times in Mountain Time.
      </footer>
    </div>
  );
}
