"use client";

import { useEffect, useState } from "react";
import { soundscape, type SoundscapeType } from "@/lib/soundscape";

export default function FocusTimer({
  gapMinutes = null,
  onComplete,
}: {
  gapMinutes?: number | null;
  onComplete?: () => void;
}) {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSound, setActiveSound] = useState<SoundscapeType>("off");
  const [volume, setVolume] = useState(0.4);
  const [focusTask, setFocusTask] = useState("");

  // Soundscape synchronization
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

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      handleSoundChange("off");
      if (onComplete) onComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      if (soundscape) soundscape.stop();
    };
  }, []);

  const selectPreset = (mins: number) => {
    setIsRunning(false);
    setTotalSeconds(mins * 60);
    setSecondsLeft(mins * 60);
  };

  const toggleRun = () => {
    if (!isRunning && activeSound === "off") {
      handleSoundChange("rain");
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
    handleSoundChange("off");
  };

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timeFormatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="focus-timer-container">
      <div className="ft-header">
        <div>
          <h3>Study Focus &amp; Pomodoro Station</h3>
          <p className="sub mono">
            Distraction-free timer with browser-native Web Audio soundscapes &amp; 40Hz focus tones.
          </p>
        </div>
      </div>

      <div className="ft-main-grid">
        {/* Timer Dial & Controls */}
        <div className="ft-clock-card">
          <div className="ft-presets mono">
            <button
              type="button"
              className={`preset-btn ${totalSeconds === 25 * 60 ? "on" : ""}`}
              onClick={() => selectPreset(25)}
            >
              25m Focus
            </button>
            <button
              type="button"
              className={`preset-btn ${totalSeconds === 50 * 60 ? "on" : ""}`}
              onClick={() => selectPreset(50)}
            >
              50m Deep
            </button>
            {gapMinutes && gapMinutes >= 15 && (
              <button
                type="button"
                className={`preset-btn ${totalSeconds === gapMinutes * 60 ? "on" : ""}`}
                onClick={() => selectPreset(gapMinutes)}
              >
                Gap ({gapMinutes}m)
              </button>
            )}
          </div>

          <div className="ft-display">
            <div className="ft-digits mono">{timeFormatted}</div>
            <div className="ft-progress-track">
              <div className="ft-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="ft-task-input-wrap">
            <input
              type="text"
              className="ft-task-input mono"
              placeholder="What are you focusing on right now?"
              value={focusTask}
              onChange={(e) => setFocusTask(e.target.value)}
            />
          </div>

          <div className="ft-action-buttons">
            <button
              type="button"
              className={`ft-btn primary mono ${isRunning ? "running" : ""}`}
              onClick={toggleRun}
            >
              {isRunning ? "Pause Session" : "Start Focus"}
            </button>
            <button type="button" className="ft-btn mono" onClick={resetTimer}>
              Reset
            </button>
          </div>
        </div>

        {/* Ambient Soundscape Controller */}
        <div className="ft-sound-card">
          <div className="ft-card-title mono">🎧 Native Audio &amp; Focus Frequencies</div>
          <p className="sub" style={{ fontSize: 12.5, margin: "6px 0 14px" }}>
            Synthesized natively via Web Audio API. Zero bandwidth, 100% offline, tuned for headphones.
          </p>

          <div className="sound-options mono">
            <button
              type="button"
              className={`sound-pill ${activeSound === "rain" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "rain" ? "off" : "rain")}
            >
              🌧️ Soft Rain
            </button>
            <button
              type="button"
              className={`sound-pill ${activeSound === "pink" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "pink" ? "off" : "pink")}
            >
              🌸 Pink Noise
            </button>
            <button
              type="button"
              className={`sound-pill ${activeSound === "drone" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "drone" ? "off" : "drone")}
            >
              🌌 Lo-Fi Drone
            </button>
            <button
              type="button"
              className={`sound-pill ${activeSound === "binaural" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "binaural" ? "off" : "binaural")}
            >
              🧠 40Hz Gamma Focus
            </button>
            <button
              type="button"
              className={`sound-pill ${activeSound === "lofi" ? "on" : ""}`}
              onClick={() => handleSoundChange(activeSound === "lofi" ? "off" : "lofi")}
            >
              📻 Vinyl &amp; Tape
            </button>
            <button
              type="button"
              className={`sound-pill ${activeSound === "off" ? "on" : ""}`}
              onClick={() => handleSoundChange("off")}
            >
              🔇 Mute
            </button>
          </div>

          {activeSound !== "off" && (
            <div className="sound-volume-slider mono">
              <span className="sub">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
              />
              <span className="vol-val">{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
