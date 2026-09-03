"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useMemo, useState } from "react";
import type { State } from "@/lib/db";
import type { CanvasResult, WeatherResult } from "@/app/page";
import type { StudyHubData } from "@/lib/study-hub-types";
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
import StudyGlance, { StudyGlanceSkeleton } from "@/components/StudyGlance";
import FitnessGlance from "@/components/FitnessGlance";
import CampusHopMap from "@/components/CampusHopMap";
import PreClassBriefModal from "@/components/PreClassBriefModal";
import { getPreClassBrief, type PreClassBrief, PRE_CLASS_BRIEFS } from "@/lib/pre-class-briefs";
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
  studyPromise: Promise<StudyHubData>;
  sun: { sunrise: string | null; sunset: string | null; daylight: string | null };
  renderedAt: string;
};

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

function jumpToCard(heading: string) {
  const h2s = Array.from(document.querySelectorAll(".card-head h2"));
  const target = h2s.find((h) => (h.textContent ?? "").trim().toLowerCase() === heading.toLowerCase());
  if (target) {
    const card = target.closest(".card");
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
}

export default function Dashboard({
  state, term, canvasPromise, newsPromise, musicPromise, weatherPromise, studyPromise, sun, renderedAt,
}: Props) {
  const router = useRouter();
  const [st, setSt] = useState<State>(state);
  const [work, setWork] = useState<ReturnType<typeof buildItems> | null>(null);
  const [now, setNow] = useState(() => localParts());
  const [clock, setClock] = useState<{ date: string; time: string } | null>(null);
  const [palette, setPalette] = useState("forest");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const [activeBrief, setActiveBrief] = useState<PreClassBrief | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.resolve(canvasPromise).then(
      (c) => { if (alive) setWork(buildItems(c.assignments, st)); },
      () => { if (alive) setWork([]); }
    );
    return () => { alive = false; };
  }, [canvasPromise, st]);

  useEffect(() => {
    const tick = () => {
      setNow(localParts());
      const d = new Date();
      setClock({
        date: d.toLocaleDateString("en-US", {
          timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          timeZone: "America/Denver", hour: "numeric", minute: "2-digit", hour12: true,
        }).toLowerCase(),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const p = localStorage.getItem("palette") || localStorage.getItem("hb:pal");
    if (p && ["forest", "dusk", "ash"].includes(p)) {
      if (p === "forest") document.documentElement.removeAttribute("data-palette");
      else document.documentElement.setAttribute("data-palette", p);
      setPalette(p);
    }
  }, []);

  function applyPalette(p: string) {
    setPalette(p);
    if (p === "forest") document.documentElement.removeAttribute("data-palette");
    else document.documentElement.setAttribute("data-palette", p);
    try { localStorage.setItem("palette", p); localStorage.setItem("hb:pal", p); } catch {}
  }

  async function mutate(body: Record<string, unknown>) {
    const withId =
      body.action === "addTodo"
        ? {
            ...body,
            id: `${TEMP_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          }
        : body;

    setSt((prev) => applyLocal(prev, withId));

    if (body.action === "deleteTodo" && String(body.id ?? "").startsWith(TEMP_PREFIX)) {
      try {
        if (await cancelQueuedAdd(String(body.id))) {
          setPending((n) => Math.max(0, n - 1));
          return;
        }
      } catch {
        // Fall through
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
      try {
        await enqueue(withId);
        setPending((n) => n + 1);
      } catch {
        // Private window or quota
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await flush();
        if (!alive) return;
        if (r.state) setSt(r.state as State);
        setPending(r.left);
      } catch {
        // IndexedDB unavailable
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
  const ledeBase = { now, term, classes: todayClasses };

  const commands: Command[] = useMemo(() => {
    const out: Command[] = [
      { id: "go-study", group: "Go", label: "Academic Study Hub", hint: "/study",
        keywords: "study flashcards anki quiz reading review decks syllabus evidence focus",
        run: () => router.push("/study") },
      { id: "go-fitness", group: "Go", label: "Training & Fitness Split", hint: "/fitness",
        keywords: "gym workout split chest back shoulders legs arms nutrition fitness phed",
        run: () => router.push("/fitness") },
      { id: "go-sky", group: "Go", label: "Sky, sun and weather", hint: "/sky",
        keywords: "moon stars planets forecast orrery tonight",
        run: () => router.push("/sky") },
      { id: "go-term", group: "Go", label: "Edit the term and schedule", hint: "/term",
        keywords: "classes courses breaks semester dates",
        run: () => router.push("/term") },
    ];

    // Pre-Class Briefs in ⌘K
    for (const [code, b] of Object.entries(PRE_CLASS_BRIEFS)) {
      out.push({
        id: `brief-${code}`,
        group: "1-Min Pre-Class Briefs",
        label: `${code}: ${b.title}`,
        keywords: `brief cheat sheet questions reading thesis ${code}`,
        hint: b.where,
        run: () => setActiveBrief(b),
      });
    }

    for (const h of [
      "Study Hub",
      "Today's Workout",
      "Weather",
      "Day at a glance",
      "Due",
      "Semester",
      "What's new",
      "Music",
    ]) {
      out.push({
        id: `jump-${h}`, group: "Jump to", label: h, hint: "scroll",
        run: () => jumpToCard(h),
      });
    }

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
  }, [work, now.iso, palette, router]);

  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.dow];
  const emptyWhy =
    now.iso < term.start ? `${term.name} starts ${longDate(term.start)}.`
    : now.iso > term.end ? `${term.name} is over.`
    : term.breaks.includes(now.iso) ? "Break — no classes today."
    : `No classes on ${dayName}s this term.`;

  return (
    <div className="wrap">
      <Offline renderedAt={renderedAt} pending={pending} />

      {/* Clean header */}
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
          <span className="themes">
            {["forest", "dusk", "ash"].map((p) => (
              <button key={p} type="button" className="mono"
                aria-pressed={palette === p} onClick={() => applyPalette(p)}>{p}</button>
            ))}
          </span>
        </div>
      </header>

      <div className="rule" />

      {/* Grid of cards */}
      <div className="grid">
        <Suspense fallback={<WeatherSkeleton />}>
          <WeatherSlot promise={weatherPromise} sun={sun} />
        </Suspense>

        <section className="card span7 day-glance-card">
          <div className="card-head"><h2>Day at a glance</h2></div>
          <div className="card-body">
            <div>
              {!todayClasses.length && (
                <div className="sub" style={{ padding: "18px 0" }}>{emptyWhy}</div>
              )}
              {todayClasses.map((c, i) => {
                const isNextClass = leave && leave.next.code === c.code;
                const brief = getPreClassBrief(c.code);

                return (
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
                            <Link href="/study" className="mono gap-study-link">
                              ✦ Start Focus
                            </Link>
                          </div>
                        </div>
                      );
                    })()}
                    <div className={`cls ${c.ck}${hhmm(c.end) <= now.minutes ? " past" : ""}${isNextClass ? " active-next" : ""}`}>
                      <div className="stripe" />
                      <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                        {fmtTime(hhmm(c.start))}<br />{fmtTime(hhmm(c.end))}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="cls-head-row">
                          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{c.code}</span>
                          {brief && (
                            <button
                              type="button"
                              className="brief-trigger mono"
                              onClick={() => setActiveBrief(brief)}
                              title="Open 1-minute pre-class cheat sheet"
                            >
                              ⚡ 1-Min Brief
                            </button>
                          )}
                        </div>
                        <div className="title">{c.title}</div>
                        <div className="sub">{c.where}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {leave && (
              <div className="callout leave-callout">
                <div className="k mono">Before you leave</div>
                <div className="v">
                  Head out by {fmtTime(leave.leaveAtMinutes)} for {leave.next.code}
                </div>
                <div className="s">
                  {leave.next.where}
                  {leave.hop && ` · Tight hop — ${leave.hop.from} to ${leave.hop.to} with ${leave.hop.gap} minutes between.`}
                </div>
                {leave.hop && (
                  <CampusHopMap
                    from={leave.hop.from}
                    to={leave.hop.to}
                    gapMinutes={leave.hop.gap}
                    leaveAtMinutes={leave.leaveAtMinutes}
                    nextClassCode={leave.next.code}
                    nextClassWhere={leave.next.where}
                  />
                )}
              </div>
            )}
          </div>
        </section>

        {/* Compact Study Hub Glance Widget */}
        <Suspense fallback={<StudyGlanceSkeleton />}>
          <StudyGlance promise={studyPromise} />
        </Suspense>

        {/* Today's Workout Glance Widget */}
        <FitnessGlance />

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

      {/* Bottom Utility Actions Toolbar */}
      <div className="bottom-toolbar">
        <div className="bt-links mono">
          <Link href="/study" className="bt-link">
            ✦ study hub
          </Link>
          <Link href="/fitness" className="bt-link">
            🏋️ workout
          </Link>
          <Link href="/sky" className="bt-link">
            ☼ sky &amp; weather
          </Link>
          <Link href="/term" className="bt-link">
            ✎ edit term
          </Link>
        </div>
        <div className="bt-cmd">
          <CommandPalette commands={commands} onCapture={(title) =>
            mutate({ action: "addTodo", title, due: now.iso })} />
        </div>
      </div>

      <PushToggle />

      {/* Pre-Class Brief Modal */}
      <PreClassBriefModal brief={activeBrief} onClose={() => setActiveBrief(null)} />

      <footer>
        Assignments come from your Canvas calendar feed, and your ticks live in a database — so
        checking something off on your phone shows up on your laptop, and an edit made with no
        signal is queued and synced when you reconnect. Weather is api.weather.gov: free, keyless,
        current. Study Hub cards are parsed from standardized Anki CSVs with SM-2 spaced repetition and weekly synthesis.
        Fitness training split covers a 6-day lean bulk protocol. Times in Mountain Time.
      </footer>
    </div>
  );
}
