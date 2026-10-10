"use client";
import DailyBrief from "@/components/DailyBrief";
import DailyShuffle from "@/components/DailyShuffle";
import EntertainmentPanel from "@/components/EntertainmentPanel";
import GmailPanel from "@/components/GmailPanel";
import ReleaseRadar from "@/components/ReleaseRadar";
import AgentStatus from "@/components/AgentStatus";
import DashboardPanel from "@/components/DashboardPanel";
import { useDeskTheme } from "@/lib/use-desk-theme";
import CustomizeDashboard from "@/components/CustomizeDashboard";
import {WeekReadings} from "./ReadingLinks";
import DeskSidebar from "@/components/DeskSidebar";
import { cohesiveLayout } from "@/lib/dashboard-layout";
import dynamic from "next/dynamic";
const ReadingDesk = dynamic(() => import("@/components/ReadingDesk"));
import DeskMode from "@/components/DeskMode";
import DayPlan from "@/components/DayPlan";
import {useFocusSession} from "@/lib/use-focus-session";
import ProjectShelf from "@/components/ProjectShelf";
import QuickCapture, { type CaptureSeed } from "@/components/QuickCapture";
import {
  PANELS,
  LAYOUT_KEY,
  panelPreference,

  dashboardTab,
  dashboardSpaceUrl,
  spacePreference,

  type DashboardTab,
  type DashboardLayout,
  type PanelId,
} from "@/lib/dashboard-layout";
import { cloudStorage } from "@/lib/cloud-storage";
import { useCloudRevision } from "@/lib/use-cloud-revision";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState, useRef } from "react";
import type { State } from "@/lib/db";
import type { CanvasResult, WeatherResult } from "@/app/page";
import type { StudyHubData } from "@/lib/study-hub-types";
import Weather from "@/components/Weather";
import TodoPanel, { TodoSkeleton, buildItems } from "@/components/TodoPanel";
import Offline from "@/components/Offline";
import PushToggle from "@/components/PushToggle";
import { applyLocal, applyQueued, TEMP_PREFIX } from "@/lib/apply";
import { enqueue, flush, all as queuedChanges } from "@/lib/outbox";
import NewsPanel, { NewsSkeleton } from "@/components/NewsPanel";
import Milestones, { MilestonesSkeleton } from "@/components/Milestones";
import type { Story } from "@/lib/feeds";
import type { Music } from "@/lib/music";
import MusicPanel, { MusicSkeleton } from "@/components/MusicPanel";
import StudyGlance, { StudyGlanceSkeleton } from "@/components/StudyGlance";
import FitnessGlance from "@/components/FitnessGlance";
import CommuteRadar from "@/components/CommuteRadar";
import CampusHopMap from "@/components/CampusHopMap";
import PreClassBriefModal from "@/components/PreClassBriefModal";
const ScratchpadDrawer = dynamic(() => import("@/components/ScratchpadDrawer"));
import WeeklyTimetable from "@/components/WeeklyTimetable";
import {
  getPreClassBrief,
  type PreClassBrief,
  PRE_CLASS_BRIEFS,
} from "@/lib/pre-class-briefs";
import {
  classesOn,
  gaps,
  hhmm,
  localParts,
  leaveAdvice,
  building,
  type ClassBlock,
} from "@/lib/schedule";
import type { Term } from "@/lib/term";
import { daysBetween, longDate } from "@/lib/localtime";
import CommandPalette, { type Command } from "@/components/CommandPalette";

type Props = {
  state: State;
  term: Term;
  canvasPromise: Promise<CanvasResult>;
  newsPromise: Promise<Story[]>;
  musicPromise: Promise<Music>;
  weatherPromise: Promise<WeatherResult>;
  studyPromise: Promise<StudyHubData>;
  sun: {
    sunrise: string | null;
    sunset: string | null;
    daylight: string | null;
  };
  renderedAt: string;
};

function WeatherSlot({
  promise,
  sun,
  renderedAt,
}: {
  promise: Promise<WeatherResult>;
  sun: Props["sun"];
  renderedAt: string;
}) {
  return <Weather weather={use(promise)} sun={sun} renderedAt={renderedAt} />;
}

function LiveClock() {
  const [clock, setClock] = useState<{ date: string; time: string } | null>(
    null,
  );

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock({
        date: d.toLocaleDateString("en-US", {
          timeZone: "America/Denver",
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: d
          .toLocaleTimeString("en-US", {
            timeZone: "America/Denver",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .toLowerCase(),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <span>{clock?.date ?? " "}</span>
      <span>{clock?.time ?? " "}</span>
    </>
  );
}

function WeatherSkeleton() {
  return (
    <section className="card span5 wxcard">
      <div className="card-head">
        <h2>Weather</h2>
        <span className="pill mono">loading</span>
      </div>
      <div className="card-body">
        <div className="skel-sky" style={{height:220,borderRadius:16}}/>
        <span className="bar" style={{width:"90%",marginTop:18}}/>
        <div className="skel-sky" style={{height:140,marginTop:16,borderRadius:12}}/>
      </div>
    </section>
  );
}

const fmtTime = (m: number) => {
  const h = Math.floor(m / 60),
    mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

function jumpToCard(heading: string) {
  const h2s = Array.from(document.querySelectorAll(".card-head h2"));
  const target = h2s.find(
    (h) => (h.textContent ?? "").trim().toLowerCase() === heading.toLowerCase(),
  );
  if (target) {
    const card = target.closest(".card");
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
}

export default function Dashboard({
  state,
  term,
  canvasPromise,
  newsPromise,
  musicPromise,
  weatherPromise,
  studyPromise,
  sun,
  renderedAt,
}: Props) {
  const router = useRouter();
  const focus = useFocusSession();
  function startDeskFocus(gap?: number) {
    if (focus.session?.completedAt !== null && focus.session) focus.actions.choose("focus");
    else if (gap && focus.session?.deadline === null && focus.session.remaining === focus.session.duration) focus.actions.choose("focus", Math.min(1440, Math.max(1, Math.floor(gap))));
    focus.actions.start();
    setDesk(true);
  }
  const [st, setSt] = useState<State>(state);
  const [work, setWork] = useState<ReturnType<typeof buildItems> | null>(null);
  const [now, setNow] = useState(() => localParts(new Date(renderedAt)));
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const [activeBrief, setActiveBrief] = useState<PreClassBrief | null>(null);
  const [viewMode, setViewMode] = useState<"today" | "week">("today");
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [notebookLoaded,setNotebookLoaded] = useState(false);
  useEffect(()=>{if(scratchpadOpen)setNotebookLoaded(true);},[scratchpadOpen]);
  const [tab, setTab] = useState<DashboardTab>("main");
  const [layout, setLayout] = useState<DashboardLayout>({});
  const layoutRef = useRef<DashboardLayout>({});
  const revision = useCloudRevision();
  const [customize, setCustomize] = useState(false),
    [desk, setDesk] = useState(false),
    [capture, setCapture] = useState<CaptureSeed | null>(null),
    [layoutError, setLayoutError] = useState("");
  useEffect(() => {
    try {
      const next = cohesiveLayout(JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}"));
      layoutRef.current = next;
      setLayout(next);
    } catch {}
  }, [revision]);
  useEffect(() => {
    const restore = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("daymark:last-space"); } catch {}
      const restored = dashboardTab(new URLSearchParams(location.search).get("space") || saved);
      setTab(restored);
      setDesk(false);
      setViewMode(restored === "school" ? "week" : "today");
      const params = new URLSearchParams(location.search);
      if (params.get("desk") === "1") setDesk(true);
      if (params.get("notebook") === "1") setScratchpadOpen(true);
      if (params.get("customize") === "1") setCustomize(true);
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  function changeLayout(key: string, value: unknown) {
    try {
      const next = {
        ...cohesiveLayout(JSON.parse(cloudStorage.getItem(LAYOUT_KEY) || "{}")),
        [key]: value,
      };
      cloudStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      layoutRef.current = next;
      setLayout(next);
      setLayoutError("");
    } catch {
      setLayoutError("Could not save customization on this device.");
    }
  }
  function openSpace(t: DashboardTab) {
    setTab(t);
    setDesk(false);
    window.scrollTo({top:0,behavior:"instant"});
    setViewMode(t === "school" ? "week" : "today");
    try {
      localStorage.setItem("daymark:last-space", t);
    } catch {}
    window.history.replaceState(window.history.state, '', dashboardSpaceUrl(window.location.href, t));
  }
  function jumpPanel(id: PanelId, preferredSpace?: DashboardTab) {
    const target = PANELS.find((p) => p.id === id);
    if (!target) return;
    const t = preferredSpace && target.tabs.includes(preferredSpace) ? preferredSpace : target.tabs.includes(tab) ? tab : target.tabs[0];
    changeLayout(`panel:${t}:${id}`, {
      ...panelPreference(layoutRef.current, t, id),
      hidden: false,
      collapsed: false,
    });
    openSpace(t);
    setTimeout(
      () =>
        document
          .querySelector(`[data-panel="${id}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100,
    );
  }

  useEffect(() => {
    let alive = true;
    Promise.resolve(canvasPromise).then(
      (c) => {
        if (alive)
          setWork(
            buildItems(c.assignments, st).filter(
              (i) => !st.dismissed.includes(i.id),
            ),
          );
      },
      () => {
        if (alive) setWork([]);
      },
    );
    return () => {
      alive = false;
    };
  }, [canvasPromise, st]);

  useEffect(() => {
    const checkMinutes = () => {
      const next = localParts();
      setNow((prev) =>
        prev.minutes === next.minutes &&
        prev.iso === next.iso &&
        prev.dow === next.dow
          ? prev
          : next,
      );
    };
    checkMinutes();
    const t = setInterval(checkMinutes, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setScratchpadOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  async function mutate(body: Record<string, unknown>) {
    const withId =
      body.action === "addTodo"
        ? {
            ...body,
            id: `${TEMP_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          }
        : body;

    setBusy(true);
    try {
      // Every write enters the durable queue before it is shown as saved.
      // Sending a newer write directly can overtake an older offline edit.
      await enqueue(withId);
      setSt(previous => applyLocal(previous, withId));
      setPending((n) => n + 1);
    } catch {
      setBusy(false);
      setLayoutError('Could not save this change on your device. Please try again.');
      return false;
    }
    try {
      const result = await flush();
      const remaining = await queuedChanges();
      if (result.state) setSt(applyQueued(result.state as State, remaining));
      setPending(remaining.length);
    } catch {
      // The write has committed locally; the regular replay will retry it.
    } finally {
      setBusy(false);
    }
    return true;
  }

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await flush();
        if (!alive) return;
        const remaining = await queuedChanges();
        if (!alive) return;
        if (r.state) setSt(applyQueued(r.state as State, remaining));
        setPending(remaining.length);
      } catch {
        // IndexedDB unavailable
      }
    };
    run();
    const onOnline = () => run();
    const onFocus = () => {
      if (!document.hidden) run();
    };
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

  const greeting =
    now.minutes < 720
      ? "Morning"
      : now.minutes < 1020
        ? "Afternoon"
        : "Evening";
  const ledeBase = { now, term, classes: todayClasses };

  const [panelUndo,setPanelUndo] = useState<{key:string;value:unknown;title:string}|null>(null);
  const [readingCourse,setReadingCourse] = useState<string>();
  const [readingFile,setReadingFile] = useState<string>();
  function openReading(file:string) {setReadingFile(file);setReadingRequest(n=>n+1);jumpPanel("readings","school");}
  const [readingRequest,setReadingRequest] = useState(0);
  const [notebookTag, setNotebookTag] = useState("General");
  const commands: Command[] = (() => {
    const out: Command[] = [
      {
        id: "action-pomodoro",
        group: "Actions",
        label: "Start Pomodoro Focus Timer",
        hint: "zen mode",
        keywords:
          "pomodoro timer focus zen clock soundscape break 25m study gap",
        run: () => startDeskFocus(),
      },
      {
        id: "go-study",
        group: "Go",
        label: "Academic Study Hub",
        hint: "/study",
        keywords:
          "study flashcards anki quiz reading review decks syllabus evidence focus",
        run: () => router.push("/study"),
      },
      {
        id: "go-fitness",
        group: "Go",
        label: "Training & Fitness Split",
        hint: "/fitness",
        keywords:
          "gym workout split chest back shoulders legs arms nutrition fitness phed",
        run: () => router.push("/fitness"),
      },
      {
        id: "go-sky",
        group: "Go",
        label: "Sky, sun and weather",
        hint: "/sky",
        keywords: "moon stars planets forecast orrery tonight",
        run: () => router.push("/sky"),
      },
      {
        id: "go-term",
        group: "Go",
        label: "Edit the term and schedule",
        hint: "/term",
        keywords: "classes courses breaks semester dates",
        run: () => router.push("/term"),
      },
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

    for (const panel of PANELS) {
      out.push({
        id: `panel-${panel.id}`,
        group: "Spaces",
        label: panel.title,
        hint: panel.tabs.join(" / "),
        run: () => jumpPanel(panel.id),
      });
    }
    for (const t of ["main", "school", "media"] as DashboardTab[])
      out.push({
        id: `space-${t}`,
        group: "Spaces",
        label: `Open ${t}`,
        run: () => openSpace(t),
      });

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
        hint:
          d < 0
            ? `${-d}d overdue`
            : d === 0
              ? "due today"
              : d === 1
                ? "tomorrow"
                : `${d}d`,
        run: () =>
          mutate(
            it.mine
              ? { action: "todoDone", id: it.id, done: true }
              : { action: "tick", key: it.id, done: true },
          ),
      });
    }

    out.push({
      id: "scratchpad",
      group: "Actions",
      label: "Open Scratchpad / Brain Dump",
      hint: "⌘J",
      keywords: "scratchpad notes memo brain dump lecture write",
      run: () => setScratchpadOpen(true),
    });
    out.push({
      id: "toggle-view-mode",
      group: "Views",
      label:
        viewMode === "today"
          ? "Switch to Weekly Timetable view"
          : "Switch to Today at a glance view",
      hint: viewMode === "today" ? "Week" : "Today",
      keywords: "calendar timetable week schedule classes",
      run: () => setViewMode((m) => (m === "today" ? "week" : "today")),
    });

    out.push({
      id: "customize-space",
      group: "Actions",
      label: "Customize this space",
      run: () => setCustomize(true),
    });
    return out;
  })();

  const dayName = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][now.dow];
  const emptyWhy =
    now.iso < term.start
      ? `${term.name} starts ${longDate(term.start)}.`
      : now.iso > term.end
        ? `${term.name} is over.`
        : term.breaks.includes(now.iso)
          ? "Break — no classes today."
          : `No classes on ${dayName}s this term.`;

  const preferences = spacePreference(layout, tab);
  const theme = useDeskTheme(tab, layout);
  const schedule = (
    <section className="card span7 day-glance-card">
      <div className="card-head">
        <h2>{viewMode === "week" ? "Weekly Timetable" : "Day at a glance"}</h2>
        <div className="view-toggle mono">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "today" ? "active" : ""}`}
            aria-pressed={viewMode === "today"}
            onClick={() => setViewMode("today")}
          >
            Today
          </button>
          <span className="view-toggle-sep">/</span>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "week" ? "active" : ""}`}
            aria-pressed={viewMode === "week"}
            onClick={() => setViewMode("week")}
          >
            Week
          </button>
        </div>
      </div>
      <div className="card-body">
        {viewMode === "week" ? (
          <WeeklyTimetable
            term={term}
            now={now}
            onSelectBrief={(brief) => setActiveBrief(brief)}
            onStartFocus={(gap) => startDeskFocus(gap)}
            onOpenReadings={(course) => {setReadingFile(undefined);setReadingCourse(course);setReadingRequest(n=>n+1);jumpPanel("readings");}}
            onOpenAssignments={() => jumpPanel("todo")}
          />
        ) : (
          <>
            <div>
              {!todayClasses.length && (
                <div className="sub" style={{ padding: "18px 0" }}>
                  {emptyWhy}
                </div>
              )}
              {todayClasses.map((c, i) => {
                const isNextClass = leave && leave.next.code === c.code;
                const brief = getPreClassBrief(c.code);

                return (
                  <div key={`${c.code}-${i}`}>
                    {openBlocks.some((g) => g.afterIndex === i - 1) &&
                      (() => {
                        const g = openBlocks.find(
                          (x) => x.afterIndex === i - 1,
                        )!;
                        if (hhmm(g.to) <= now.minutes) return null;
                        const h = Math.floor(g.minutes / 60),
                          m = g.minutes % 60;
                        return (
                          <div className="gap">
                            <div className="gline" />
                            <div
                              className="mono"
                              style={{ fontSize: 11, color: "var(--ink-3)" }}
                            >
                              {h ? `${h}h ` : ""}
                              {m ? `${m}m` : ""}
                            </div>
                            <div className="gtxt">
                              <span className="gtxt-desc">
                                open block — {fmtTime(hhmm(g.from))} to{" "}
                                {fmtTime(hhmm(g.to))}
                              </span>
                              <button
                                type="button"
                                className="mono gap-study-btn"
                                onClick={() => startDeskFocus(g.minutes)}
                              >
                                ✦ Focus ({g.minutes}m)
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    <div
                      className={`cls ${c.ck}${hhmm(c.end) <= now.minutes ? " past" : ""}${isNextClass ? " active-next" : ""}`}
                    >
                      <div className="stripe" />
                      <div
                        className="mono"
                        style={{ fontSize: 12, color: "var(--ink-2)" }}
                      >
                        {fmtTime(hhmm(c.start))}
                        <br />
                        {fmtTime(hhmm(c.end))}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="cls-head-row">
                          <span
                            className="mono"
                            style={{ fontSize: 10, color: "var(--ink-3)" }}
                          >
                            {c.code}
                          </span>
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

            {/* UNM South Lot Commute Radar */}
            <CommuteRadar
              nextClass={
                todayClasses.find((c) => hhmm(c.end) > now.minutes) || null
              }
              doneForToday={
                todayClasses.length > 0 &&
                todayClasses.every((c) => hhmm(c.end) <= now.minutes)
              }
              nowMinutes={now.minutes}
            />

            {leave?.hop && (
              <div className="callout leave-callout">
                <div className="k mono">Campus connection</div>
                <div className="v">
                  Head out by {fmtTime(leave.leaveAtMinutes)} for{" "}
                  {leave.next.code}
                </div>
                <div className="s">
                  {leave.next.where}
                  {leave.hop &&
                    ` · Tight hop — ${leave.hop.from} to ${leave.hop.to} with ${leave.hop.gap} minutes between.`}
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
          </>
        )}
        {tab === "school" && <WeekReadings term={term} date={now.iso} onRead={openReading}/>}
        {tab === "main" && <DayPlan classes={todayClasses} now={now}/>}
      </div>
    </section>
  );
  const panels: Record<PanelId, React.ReactNode> = {
    schedule,
    gmail: <GmailPanel onCapture={setCapture} />,
    weather: (
      <Suspense fallback={<WeatherSkeleton />}>
        <WeatherSlot promise={weatherPromise} sun={sun} renderedAt={renderedAt} />
      </Suspense>
    ),
    music: (
      <Suspense fallback={<MusicSkeleton />}>
        <MusicPanel promise={musicPromise} compact={tab === "main"} />
      </Suspense>
    ),
    projects: <ProjectShelf />,
    readings: (
      <ReadingDesk
        term={term} assignments={work||[]} fileRequest={readingFile}
        courseFilter={readingCourse} courseRequest={readingRequest}
        onFocus={() => startDeskFocus()}
        onOpenNote={(key) => {
          setNotebookTag(key);
          setScratchpadOpen(true);
        }}
      />
    ),
    study: (
      <Suspense fallback={<StudyGlanceSkeleton />}>
        <StudyGlance promise={studyPromise} />
      </Suspense>
    ),
    semester: (
      <Suspense fallback={<MilestonesSkeleton />}>
        <Milestones term={term} promise={canvasPromise} st={st} />
      </Suspense>
    ),
    fitness: <FitnessGlance />,
    todo: (
      <Suspense fallback={<TodoSkeleton />}>
        <TodoPanel
          promise={canvasPromise}
          st={st}
          busy={busy}
          nowIso={now.iso}
          mutate={mutate}
          onRead={openReading}
        />
      </Suspense>
    ),
    shuffle: (
      <Suspense fallback={<MusicSkeleton />}>
        <DailyShuffle promise={musicPromise} />
      </Suspense>
    ),
    entertainment: <EntertainmentPanel musicPromise={musicPromise} />,
    releases: <ReleaseRadar musicPromise={musicPromise} space={tab} onBrowse={() => jumpPanel("releases", "media")}/>,
    news: (
      <Suspense fallback={<NewsSkeleton />}>
        <NewsPanel promise={newsPromise} st={st} mutate={mutate} space={tab} onBrowse={() => jumpPanel("news", "media")} />
      </Suspense>
    ),
  };
  const orderedPanels = PANELS.filter(p=>p.tabs.includes(tab) && !panelPreference(layout,tab,p.id).hidden).sort((a,b)=>(panelPreference(layout,tab,a.id).order??PANELS.indexOf(a))-(panelPreference(layout,tab,b.id).order??PANELS.indexOf(b)));
  const renderPanel = (p: typeof PANELS[number]) => {
                const pref = panelPreference(layout, tab, p.id);
                return (
                  <DashboardPanel
                    key={`${tab}:${p.id}`}
                    id={p.id}
                    title={p.id === "schedule" ? tab === "main" ? "Day at a glance" : "Your week" : p.title}
                    span={
                      tab === "main" &&
                      ["schedule", "gmail", "weather", "music"].includes(p.id)
                        ? 6
                        : 12
                    }
                    displayOrder={orderedPanels.indexOf(p)}
                    preference={{
                      ...pref,
                      order: pref.order ?? PANELS.indexOf(p),
                    }}
                    onChange={(id,value)=>{if(value.hidden&&!pref.hidden)setPanelUndo({key:`panel:${tab}:${id}`,value:pref,title:p.title});changeLayout(`panel:${tab}:${id}`,value);}}
                  >
                    {panels[p.id]}
                  </DashboardPanel>
                );
  };
  const panelGroups: (typeof PANELS[number])[][] = [];
  const compactPanel = (p:typeof PANELS[number]) => tab==="main" && ["schedule","gmail","weather","music"].includes(p.id);
  for(const p of orderedPanels) {
    const last=panelGroups[panelGroups.length-1];
    if(compactPanel(p)&&last&&compactPanel(last[0])) last.push(p);
    else panelGroups.push([p]);
  }
  return (
    <div
      className="personal-dashboard"
      data-desk={desk}
      data-focus={desk && focus.foreground}
      data-appearance={theme.appearance}
      data-palette={theme.palette}
      data-accent={theme.accent}
      data-density={preferences.density}
    >
      <DeskSidebar space={tab} layout={layout} inert={desk && focus.foreground}
        onSpace={openSpace} onPanel={jumpPanel} desk={desk} onDesk={()=>setDesk(!desk)}
        onNotebook={()=>setScratchpadOpen(true)} onCustomize={()=>setCustomize(true)} />
      <main className="desk-stage">
        <Offline renderedAt={renderedAt} pending={pending} />
        <div className="desk-topbar" inert={desk && focus.foreground}>
          <span className="mono sub">
            {term.name} · <LiveClock />
          </span>
          <div>
            <button onClick={() => setCapture({})}>Capture</button>
            <button
              onClick={() => setCustomize(true)}
              aria-label="Customize current space"
            >
              Customize
            </button>
          </div>
        </div>
        {desk ? (
          <DeskMode
            onClose={() => setDesk(false)}
            onRead={() => jumpPanel("readings")}
          />
        ) : (
          <>
            <header className={`desk-heading${tab === "main" ? " main-heading" : ""}`}>
              <div>
                {tab === "main" && <span className="desk-eyebrow mono">Your day, at a glance</span>}
                <h1>
                  {tab === "main"
                    ? `${greeting}, Brayan.`
                    : tab === "school"
                      ? "This week."
                      : "Media room."}
                </h1>
                {tab === "main" && <DailyBrief promise={canvasPromise} state={st} base={ledeBase} />}
              </div>
              {tab === "main" && <div className="main-actions" aria-label="Daily actions">
                <button type="button" className="main-focus-action" onClick={() => startDeskFocus()}>Start focus <span aria-hidden="true">↗</span></button>
                <button type="button" onClick={() => jumpPanel("todo", "school")}>View tasks</button>
                <button type="button" onClick={() => setScratchpadOpen(true)}>Notebook</button>
              </div>}
              {tab === "school" && <Link href="/study">Cards & review ↗</Link>}
            </header>
            {panelUndo && <p className="panel-undo" role="status">{panelUndo.title} hidden <button type="button" onClick={()=>{changeLayout(panelUndo.key,panelUndo.value);setPanelUndo(null);}}>Undo</button></p>}
            <div className={`desk-grid space-${tab}`}>
              {panelGroups.map(group=>compactPanel(group[0]) ? <div key={group[0].id} className="desk-overview-columns" style={{order:orderedPanels.indexOf(group[0])}}>
                {[0,1].map(column=><div key={column} className="desk-overview-column">{group.filter((_,i)=>i%2===column).map(renderPanel)}</div>)}
              </div> : renderPanel(group[0]))}
            </div>
            <div className="desk-bottom">
              <button onClick={() => setScratchpadOpen(true)}>
                Open notebook · ⌘J
              </button>
              <CommandPalette
                commands={commands}
                onCapture={(title) => setCapture({ title })}
              />
              <Link href="/sky">Sky & weather</Link>
              <Link href="/term">Edit term</Link>
            </div>
          </>
        )}
        {layoutError && <p role="alert">{layoutError}</p>}
        {!desk && focus.session && (focus.session.deadline !== null || focus.session.completedAt !== null || focus.session.remaining < focus.session.duration) && <button type="button" className="focus-resume" onClick={() => {focus.actions.foreground(true);setDesk(true);}}>{focus.session.completedAt !== null ? "Focus session complete" : `Resume timer · ${String(Math.floor(focus.session.remaining/60)).padStart(2,"0")}:${String(focus.session.remaining%60).padStart(2,"0")}`}</button>}
        {!desk && (
          <>
            <details className="desk-connections">
              <summary>Connections & sync</summary>
              <AgentStatus />
            </details>
            <PushToggle />
          </>
        )}
        <footer className="desk-footer" inert={desk && focus.foreground}>
          Mountain Time
        </footer>
      </main>
      {customize && (
        <CustomizeDashboard
          tab={tab}
          layout={layout}
          onChange={changeLayout}
          onClose={() => setCustomize(false)}
        />
      )}
      {capture && (
        <QuickCapture
          seed={capture}
          onClose={() => setCapture(null)}
          onTask={(title) =>
            mutate({ action: "addTodo", title, due: now.iso })
          }
        />
      )}
      <PreClassBriefModal
        brief={activeBrief}
        onClose={() => setActiveBrief(null)}
      />
      {(scratchpadOpen||notebookLoaded)&&<ScratchpadDrawer
        defaultTag={notebookTag}
        isOpen={scratchpadOpen}
        onClose={() => setScratchpadOpen(false)}
      />}
    </div>
  );
}
