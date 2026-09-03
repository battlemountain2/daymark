"use client";

import { useEffect, useState } from "react";
import { soundscape, type SoundscapeType } from "@/lib/soundscape";

type Mode = "focus" | "shortBreak" | "longBreak";

type Props = {
  gapMinutes?: number | null;
  onClose: () => void;
};

export default function PomodoroModal({ gapMinutes = null, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("focus");
  const [cycle, setCycle] = useState<number>(1);
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [activeSound, setActiveSound] = useState<SoundscapeType>("rain");
  const [volume, setVolume] = useState<number>(0.35);
  const [task, setTask] = useState<string>("");

  // Start sound on open if running
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
      // Completed interval
      setIsRunning(false);
      playCompletionChime();

      if (mode === "focus") {
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
  }, [isRunning, secondsLeft, mode, cycle]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        setIsRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timeFormatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="pomo-dimmed-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pomo-zen-box" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="pomo-header mono">
          <div className="pomo-status">
            <span className="pomo-cycle-badge">
              🍅 {mode === "focus" ? "FOCUS" : "BREAK"} #{cycle}/4
            </span>
            <div className="pomo-dots">
              {[1, 2, 3, 4].map((dot) => (
                <span
                  key={dot}
                  className={`pomo-dot ${dot < cycle ? "filled" : dot === cycle ? "current" : ""}`}
                />
              ))}
            </div>
          </div>

          <button type="button" className="pomo-close-btn" onClick={onClose} title="Exit Zen Mode (Esc)">
            ✕ Exit Zen
          </button>
        </div>

        {/* Mode Selector */}
        <div className="pomo-modes-bar mono">
          <button
            type="button"
            className={`pomo-mode-btn ${mode === "focus" && totalSeconds === 25 * 60 ? "on" : ""}`}
            onClick={() => switchMode("focus")}
          >
            25m Focus
          </button>
          <button
            type="button"
            className={`pomo-mode-btn ${mode === "shortBreak" ? "on" : ""}`}
            onClick={() => switchMode("shortBreak")}
          >
            5m Short Break
          </button>
          <button
            type="button"
            className={`pomo-mode-btn ${mode === "longBreak" ? "on" : ""}`}
            onClick={() => switchMode("longBreak")}
          >
            15m Long Break
          </button>
          {gapMinutes && gapMinutes >= 15 && (
            <button
              type="button"
              className={`pomo-mode-btn ${totalSeconds === gapMinutes * 60 ? "on" : ""}`}
              onClick={() => selectGap(gapMinutes)}
            >
              Gap ({gapMinutes}m)
            </button>
          )}
        </div>

        {/* Giant Monospace Digits */}
        <div className="pomo-clock-hero">
          <div className="pomo-digits mono">{timeFormatted}</div>
          <div className="pomo-progress-track">
            <div className="pomo-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Task Input */}
        <div className="pomo-task-wrap">
          <input
            type="text"
            className="pomo-task-input mono"
            placeholder="What is your singular focus right now?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
        </div>

        {/* Primary Action Buttons */}
        <div className="pomo-actions mono">
          <button
            type="button"
            className={`pomo-main-btn ${isRunning ? "running" : ""}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? "Pause Session" : "Start Focus"}
          </button>
          <button
            type="button"
            className="pomo-reset-btn"
            onClick={() => {
              setIsRunning(false);
              setSecondsLeft(totalSeconds);
            }}
          >
            Reset
          </button>
        </div>

        {/* Soundscape Ambient Selector */}
        <div className="pomo-soundscape-bar mono">
          <div className="psb-head">
            <span>🎧 Focus Audio:</span>
            {activeSound !== "off" && (
              <div className="psb-vol">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          <div className="psb-options">
            <button
              type="button"
              className={`psb-pill ${activeSound === "rain" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "rain" ? "off" : "rain")}
            >
              🌧️ Rain
            </button>
            <button
              type="button"
              className={`psb-pill ${activeSound === "pink" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "pink" ? "off" : "pink")}
            >
              🌸 Pink
            </button>
            <button
              type="button"
              className={`psb-pill ${activeSound === "binaural" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "binaural" ? "off" : "binaural")}
            >
              🧠 40Hz
            </button>
            <button
              type="button"
              className={`psb-pill ${activeSound === "lofi" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "lofi" ? "off" : "lofi")}
            >
              📻 Vinyl
            </button>
            <button
              type="button"
              className={`psb-pill ${activeSound === "off" ? "on" : ""}`}
              onClick={() => handleSoundChange("off")}
            >
              🔇 Off
            </button>
          </div>
        </div>

        <div className="pomo-hint mono">
          <span>[Space] Pause / Resume</span>
          <span>[Esc] Return to Dashboard</span>
        </div>
      </div>
    </div>
  );
}
