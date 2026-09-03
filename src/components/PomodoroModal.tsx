"use client";

import { useEffect, useState, useMemo } from "react";
import { soundscape, type SoundscapeType } from "@/lib/soundscape";
import { COURSE_CRIBS, type CourseCrib } from "@/lib/course-crib-data";

type Mode = "focus" | "shortBreak" | "longBreak";
type Theme = "midnight" | "rain" | "ember" | "oled";

interface FocusStats {
  date: string;
  totalMinutes: number;
  sessions: number;
  byCourse: Record<string, number>;
}

const COURSES = [
  { code: "POLS 2120", label: "POLS 2120" },
  { code: "HIST 300", label: "HIST 300" },
  { code: "GEOG 1160", label: "GEOG 1160" },
  { code: "GEOG 1150", label: "GEOG 1150" },
  { code: "PHED 2996", label: "PHED 2996" },
];

export default function PomodoroModal({
  gapMinutes = null,
  onClose,
}: {
  gapMinutes?: number | null;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("focus");
  const [cycle, setCycle] = useState<number>(1);
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [activeSound, setActiveSound] = useState<SoundscapeType>("rain");
  const [volume, setVolume] = useState<number>(0.35);
  const [task, setTask] = useState<string>("");
  const [theme, setTheme] = useState<Theme>("midnight");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [todayFocusMins, setTodayFocusMins] = useState<number>(0);

  // Load stats from localStorage
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem("daymark:focus-stats");
      if (raw) {
        const stats: FocusStats = JSON.parse(raw);
        if (stats.date === todayStr) {
          setTodayFocusMins(stats.totalMinutes || 0);
        }
      }
    } catch {}
  }, []);

  const recordFocusCompletion = (mins: number, courseCode: string | null) => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem("daymark:focus-stats");
      let stats: FocusStats = {
        date: todayStr,
        totalMinutes: 0,
        sessions: 0,
        byCourse: {},
      };
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr) stats = parsed;
      }
      stats.totalMinutes += mins;
      stats.sessions += 1;
      if (courseCode) {
        stats.byCourse[courseCode] = (stats.byCourse[courseCode] || 0) + mins;
      }
      localStorage.setItem("daymark:focus-stats", JSON.stringify(stats));
      setTodayFocusMins(stats.totalMinutes);
    } catch {}
  };

  // Soundscape start & teardown
  useEffect(() => {
    if (soundscape) {
      soundscape.play("rain", 0.35);
    }
    return () => {
      if (soundscape) soundscape.stop();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    let t: any = null;
    if (isRunning && secondsLeft > 0) {
      t = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (isRunning && secondsLeft === 0) {
      setIsRunning(false);
      playCompletionChime();

      if (mode === "focus") {
        const completedMins = Math.round(totalSeconds / 60);
        recordFocusCompletion(completedMins, selectedCourse);

        if (cycle >= 4) {
          switchMode("longBreak");
          setCycle(1);
        } else {
          switchMode("shortBreak");
          setCycle((c) => c + 1);
        }
      } else {
        switchMode("focus");
      }
    }
    return () => clearInterval(t);
  }, [isRunning, secondsLeft, mode, cycle, totalSeconds, selectedCourse]);

  // Keyboard navigation & Fullscreen change listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        setIsRunning((r) => !r);
      }
    };

    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, [onClose]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    let dur = 25 * 60;
    if (newMode === "shortBreak") dur = 5 * 60;
    else if (newMode === "longBreak") dur = 15 * 60;
    setTotalSeconds(dur);
    setSecondsLeft(dur);
    setIsRunning(true);
  };

  const selectGap = (mins: number) => {
    setMode("focus");
    const dur = mins * 60;
    setTotalSeconds(dur);
    setSecondsLeft(dur);
    setIsRunning(true);
  };

  const handleSoundChange = (type: SoundscapeType) => {
    setActiveSound(type);
    if (soundscape) {
      if (type === "off") soundscape.stop();
      else soundscape.play(type, volume);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (soundscape) soundscape.setVolume(vol);
  };

  const playCompletionChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.35); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timeFormatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  // Circular progress math (radius: 116, circumference = 2 * PI * 116 ≈ 728.85)
  const RADIUS = 116;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE - (progressPct / 100) * CIRCUMFERENCE;

  const currentCrib: CourseCrib | null = useMemo(() => {
    if (!selectedCourse) return null;
    return COURSE_CRIBS[selectedCourse] || null;
  }, [selectedCourse]);

  return (
    <div
      className={`pomo-cinematic-scrim theme-${theme} ${isFullscreen ? "is-fullscreen" : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`pomo-station-wrap ${showNotes && currentCrib ? "with-notes" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Focus Console */}
        <div className="pomo-console-card">
          {/* Top Control Bar */}
          <div className="pomo-top-bar mono">
            {/* Theme Picker */}
            <div className="pomo-theme-pills">
              <button
                type="button"
                className={`theme-pill ${theme === "midnight" ? "active" : ""}`}
                onClick={() => setTheme("midnight")}
                title="Midnight Desert Theme"
              >
                🌌 Desert
              </button>
              <button
                type="button"
                className={`theme-pill ${theme === "rain" ? "active" : ""}`}
                onClick={() => setTheme("rain")}
                title="Rainy Window Theme"
              >
                🌧️ Rain
              </button>
              <button
                type="button"
                className={`theme-pill ${theme === "ember" ? "active" : ""}`}
                onClick={() => setTheme("ember")}
                title="Ember Hearth Warmth Theme"
              >
                🕯️ Ember
              </button>
              <button
                type="button"
                className={`theme-pill ${theme === "oled" ? "active" : ""}`}
                onClick={() => setTheme("oled")}
                title="Pitch Black OLED Minimalist Theme"
              >
                🖤 OLED
              </button>
            </div>

            {/* Utility buttons */}
            <div className="pomo-top-actions">
              <button
                type="button"
                className="pomo-fs-btn"
                onClick={toggleFullscreen}
                title="Fullscreen Desk Clock Mode"
              >
                {isFullscreen ? "⛶ Exit Fullscreen" : "⛶ Desk Mode"}
              </button>
              <button
                type="button"
                className="pomo-exit-btn"
                onClick={onClose}
                title="Exit Zen Focus Mode (Esc)"
              >
                ✕ Exit Zen
              </button>
            </div>
          </div>

          {/* Course Tagging Selector */}
          <div className="pomo-courses-bar mono">
            <span className="pcb-label sub">Tag Course:</span>
            <div className="pcb-pills">
              <button
                type="button"
                className={`course-pill ${selectedCourse === null ? "on" : ""}`}
                onClick={() => {
                  setSelectedCourse(null);
                  setShowNotes(false);
                }}
              >
                General Focus
              </button>
              {COURSES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`course-pill ${selectedCourse === c.code ? "on" : ""}`}
                  onClick={() => {
                    if (selectedCourse === c.code) {
                      setSelectedCourse(null);
                      setShowNotes(false);
                    } else {
                      setSelectedCourse(c.code);
                      setShowNotes(true);
                    }
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="pomo-modes-row mono">
            <button
              type="button"
              className={`pomo-m-pill ${mode === "focus" && totalSeconds === 25 * 60 ? "on" : ""}`}
              onClick={() => switchMode("focus")}
            >
              25m Focus
            </button>
            <button
              type="button"
              className={`pomo-m-pill ${mode === "shortBreak" ? "on" : ""}`}
              onClick={() => switchMode("shortBreak")}
            >
              5m Short Break
            </button>
            <button
              type="button"
              className={`pomo-m-pill ${mode === "longBreak" ? "on" : ""}`}
              onClick={() => switchMode("longBreak")}
            >
              15m Long Break
            </button>
            {gapMinutes && gapMinutes >= 15 && (
              <button
                type="button"
                className={`pomo-m-pill ${totalSeconds === gapMinutes * 60 ? "on" : ""}`}
                onClick={() => selectGap(gapMinutes)}
              >
                Gap ({gapMinutes}m)
              </button>
            )}
          </div>

          {/* Circular Glowing SVG Countdown Hero */}
          <div className="pomo-radial-hero">
            <svg
              className="pomo-radial-svg"
              width="270"
              height="270"
              viewBox="0 0 270 270"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="pomoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--pomo-glow-start)" />
                  <stop offset="100%" stopColor="var(--pomo-glow-end)" />
                </linearGradient>
                <filter id="pomoGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Track */}
              <circle
                className="pomo-track-circle"
                cx="135"
                cy="135"
                r={RADIUS}
                fill="none"
                strokeWidth="7"
              />

              {/* Glowing Dynamic Progress Ring */}
              <circle
                className="pomo-fill-circle"
                cx="135"
                cy="135"
                r={RADIUS}
                fill="none"
                stroke="url(#pomoGradient)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                filter="url(#pomoGlow)"
              />
            </svg>

            {/* In-Ring Digital Readout */}
            <div className="pomo-ring-center">
              <div className="pomo-cycle-indicator mono">
                <span className="pci-tag">
                  {mode === "focus" ? "FOCUS" : "BREAK"} #{cycle}/4
                </span>
                <div className="pci-dots">
                  {[1, 2, 3, 4].map((dot) => (
                    <span
                      key={dot}
                      className={`pci-dot ${
                        dot < cycle ? "filled" : dot === cycle ? "current" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pomo-big-digits mono">{timeFormatted}</div>

              {selectedCourse && (
                <div className="pomo-course-badge mono">
                  ✦ {selectedCourse}
                </div>
              )}
            </div>
          </div>

          {/* Singular Focus Task Bar */}
          <div className="pomo-task-container">
            <input
              type="text"
              className="pomo-task-field mono"
              placeholder="Singular focus: drafting essay, reviewing terms..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="pomo-btn-grid mono">
            <button
              type="button"
              className={`pomo-primary-btn ${isRunning ? "running" : ""}`}
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? "Pause Session [Space]" : "Start Focus [Space]"}
            </button>
            <button
              type="button"
              className="pomo-ghost-btn"
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft(totalSeconds);
              }}
            >
              Reset
            </button>
            {currentCrib && (
              <button
                type="button"
                className={`pomo-companion-toggle ${showNotes ? "active" : ""}`}
                onClick={() => setShowNotes(!showNotes)}
              >
                {showNotes ? "Hide Notes ✕" : `📖 ${selectedCourse} Notes`}
              </button>
            )}
          </div>

          {/* Ambient Soundscape Bar */}
          <div className="pomo-ambient-bar mono">
            <div className="pab-header">
              <span className="sub">🎧 Focus Audio:</span>
              {activeSound !== "off" && (
                <div className="pab-vol-wrap">
                  <span className="sub" style={{ fontSize: 10 }}>Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  />
                  <span className="pab-pct">{Math.round(volume * 100)}%</span>
                </div>
              )}
            </div>
            <div className="pab-pills">
              <button
                type="button"
                className={`pab-pill ${activeSound === "rain" ? "on" : ""}`}
                onClick={() => handleSoundChange(activeSound === "rain" ? "off" : "rain")}
              >
                🌧️ Rain
              </button>
              <button
                type="button"
                className={`pab-pill ${activeSound === "pink" ? "on" : ""}`}
                onClick={() => handleSoundChange(activeSound === "pink" ? "off" : "pink")}
              >
                🌸 Pink
              </button>
              <button
                type="button"
                className={`pab-pill ${activeSound === "binaural" ? "on" : ""}`}
                onClick={() => handleSoundChange(activeSound === "binaural" ? "off" : "binaural")}
              >
                🧠 40Hz
              </button>
              <button
                type="button"
                className={`pab-pill ${activeSound === "lofi" ? "on" : ""}`}
                onClick={() => handleSoundChange(activeSound === "lofi" ? "off" : "lofi")}
              >
                📻 Vinyl
              </button>
              <button
                type="button"
                className={`pab-pill ${activeSound === "off" ? "on" : ""}`}
                onClick={() => handleSoundChange("off")}
              >
                🔇 Off
              </button>
            </div>
          </div>

          {/* Bottom Footer Stats */}
          <div className="pomo-stat-footer mono">
            <span>Today&apos;s Focus: <strong>{todayFocusMins}m</strong></span>
            <span>[Space] Pause · [Esc] Exit</span>
          </div>
        </div>

        {/* Subdued Study Companion / Crib Sheet Drawer */}
        {showNotes && currentCrib && (
          <aside className="pomo-subdued-companion">
            <div className="psc-head">
              <div className="psc-title">
                <span className="psc-code mono">{currentCrib.code}</span>
                <span className="psc-name">{currentCrib.name}</span>
              </div>
              <button
                type="button"
                className="psc-close-btn mono"
                onClick={() => setShowNotes(false)}
                title="Close Notes"
              >
                ✕
              </button>
            </div>

            <div className="psc-body">
              {/* Core Theses */}
              <div className="psc-section">
                <div className="psc-sec-label mono">✦ Core Theses &amp; Frameworks</div>
                <ul className="psc-list">
                  {currentCrib.theses.map((th, i) => (
                    <li key={i}>{th}</li>
                  ))}
                </ul>
              </div>

              {/* Key Concepts */}
              <div className="psc-section">
                <div className="psc-sec-label mono">✦ High-Yield Concepts</div>
                <div className="psc-defs">
                  {currentCrib.keyConcepts.map((kc, i) => (
                    <div key={i} className="psc-def-item">
                      <strong className="mono">{kc.term}:</strong> <span>{kc.def}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Socratic Essay Prompts */}
              <div className="psc-section">
                <div className="psc-sec-label mono">✦ Guiding Socratic Prompts</div>
                <ul className="psc-prompts">
                  {currentCrib.promptQuestions.map((pq, i) => (
                    <li key={i}>&ldquo;{pq}&rdquo;</li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
