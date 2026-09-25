"use client";

import React, { useState, useEffect, useRef } from "react";

type SoundPreset = {
  id: string;
  name: string;
  desc: string;
  genre: string;
  rpm: number;
};

const PRESETS: SoundPreset[] = [
  {
    id: "rain",
    name: "Rain & Vinyl Crackle",
    desc: "Cozy rainfall on windowpane with needle dust crackles",
    genre: "Ambient Lo-Fi",
    rpm: 33,
  },
  {
    id: "chords",
    name: "Analog Tape Chords",
    desc: "Warm electric piano & mellow analog tape saturation",
    genre: "Chillhop",
    rpm: 33,
  },
  {
    id: "gamma",
    name: "40Hz Gamma Focus",
    desc: "Isochronic cognitive pulse over deep brown noise",
    genre: "Binaural Study",
    rpm: 45,
  },
  {
    id: "wind",
    name: "Hunter's Night Wind",
    desc: "Subdued nocturnal wind sweep with distant cathedral chimes",
    genre: "Atmospheric",
    rpm: 33,
  },
];

export default function LofiDeck() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<SoundPreset>(PRESETS[0]);
  const [volume, setVolume] = useState(0.65);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Web Audio Context & Nodes refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<Array<{ stop?: () => void; disconnect: () => void }>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer counter
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Volume & Mute sync
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const targetVol = isMuted ? 0 : volume;
      masterGainRef.current.gain.setTargetAtTime(targetVol, audioCtxRef.current.currentTime, 0.05);
    }
  }, [volume, isMuted]);

  // Initialize or retrieve persistent AudioContext + Master Gain
  const getAudioContext = (): { ctx: AudioContext; master: GainNode } | null => {
    if (typeof window === "undefined") return null;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const ctx = new AudioContextClass();
      const master = ctx.createGain();
      master.gain.value = isMuted ? 0 : volume;
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = master;
      return { ctx, master };
    }

    const ctx = audioCtxRef.current;
    if (!masterGainRef.current) {
      const master = ctx.createGain();
      master.gain.value = isMuted ? 0 : volume;
      master.connect(ctx.destination);
      masterGainRef.current = master;
    }

    return { ctx, master: masterGainRef.current };
  };

  // Disconnect and stop currently playing sound generators WITHOUT suspending the context
  const stopActiveNodes = () => {
    for (const node of activeNodesRef.current) {
      try {
        if (typeof node.stop === "function") {
          node.stop();
        }
      } catch {}
      try {
        node.disconnect();
      } catch {}
    }
    activeNodesRef.current = [];
  };

  // Stop audio and suspend context (used when explicitly pausing)
  const stopAudio = () => {
    stopActiveNodes();
    if (audioCtxRef.current && audioCtxRef.current.state === "running") {
      audioCtxRef.current.suspend().catch(() => {});
    }
  };

  // Build audio synthesizer according to preset
  const startAudio = async (presetId: string) => {
    // 1. Immediately disconnect old nodes to prevent overlap/clicking
    stopActiveNodes();

    const audioSetup = getAudioContext();
    if (!audioSetup) return;
    const { ctx, master } = audioSetup;

    // 2. Ensure AudioContext is actively running (handles browser autoplay policies & wake from pause)
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    // Refresh master gain volume
    master.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);

    if (presetId === "rain") {
      // --- 1. Rain noise generator (Pink Noise via 3-pole filter) ---
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.22;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "lowpass";
      rainFilter.frequency.value = 1300;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.32;

      whiteNoise.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(master);
      whiteNoise.start();
      activeNodesRef.current.push(whiteNoise);

      // --- 2. Vinyl needle crackle generator ---
      const crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const cOut = crackleBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        cOut[i] = Math.random() > 0.9982 ? (Math.random() * 2 - 1) * 0.75 : 0;
      }
      const crackle = ctx.createBufferSource();
      crackle.buffer = crackleBuffer;
      crackle.loop = true;

      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = "highpass";
      crackleFilter.frequency.value = 2000;

      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0.25;

      crackle.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(master);
      crackle.start();
      activeNodesRef.current.push(crackle);

    } else if (presetId === "chords") {
      // --- Analog Tape Rhodes Chords (Fmaj9 / Chillhop harmony) ---
      // F2 (bass anchor), F3, A3, C4, E4, G4
      const freqs = [87.31, 174.61, 220.0, 261.63, 329.63, 392.0];
      const gains = [0.18, 0.20, 0.16, 0.16, 0.14, 0.12];

      const chordsGain = ctx.createGain();
      chordsGain.gain.value = 0.32;

      const mainFilter = ctx.createBiquadFilter();
      mainFilter.type = "lowpass";
      mainFilter.frequency.value = 950;
      mainFilter.Q.value = 1.2;

      // Analog tape wow & flutter LFO
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.28;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 45; // Modulate cutoff by +-45Hz
      lfo.connect(lfoGain);
      lfoGain.connect(mainFilter.frequency);
      lfo.start();
      activeNodesRef.current.push(lfo);

      // Pitch vibrato / tape drift for subtle warmth
      const pitchLfo = ctx.createOscillator();
      pitchLfo.frequency.value = 0.18;
      const pitchLfoGain = ctx.createGain();
      pitchLfoGain.gain.value = 0.9; // subtle +-0.9Hz pitch wobble
      pitchLfo.start();
      activeNodesRef.current.push(pitchLfo);

      freqs.forEach((freq, idx) => {
        // Warm triangle note
        const oscTri = ctx.createOscillator();
        oscTri.type = "triangle";
        oscTri.frequency.value = freq;
        pitchLfoGain.connect(oscTri.frequency);

        // Sine overtone for body
        const oscSine = ctx.createOscillator();
        oscSine.type = "sine";
        oscSine.frequency.value = freq;
        pitchLfoGain.connect(oscSine.frequency);

        const noteGain = ctx.createGain();
        noteGain.gain.value = gains[idx] || 0.15;

        oscTri.connect(noteGain);
        oscSine.connect(noteGain);
        noteGain.connect(mainFilter);

        oscTri.start();
        oscSine.start();
        activeNodesRef.current.push(oscTri, oscSine);
      });

      // Subtle cassette tape hiss layer
      const bSize = ctx.sampleRate * 2;
      const tapeBuffer = ctx.createBuffer(1, bSize, ctx.sampleRate);
      const tapeData = tapeBuffer.getChannelData(0);
      for (let i = 0; i < bSize; i++) {
        tapeData[i] = (Math.random() * 2 - 1) * 0.04;
      }
      const tapeHiss = ctx.createBufferSource();
      tapeHiss.buffer = tapeBuffer;
      tapeHiss.loop = true;

      const tapeFilter = ctx.createBiquadFilter();
      tapeFilter.type = "bandpass";
      tapeFilter.frequency.value = 2400;
      tapeFilter.Q.value = 1.0;

      const tapeGain = ctx.createGain();
      tapeGain.gain.value = 0.08;

      tapeHiss.connect(tapeFilter);
      tapeFilter.connect(tapeGain);
      tapeGain.connect(master);
      tapeHiss.start();
      activeNodesRef.current.push(tapeHiss);

      mainFilter.connect(chordsGain);
      chordsGain.connect(master);

    } else if (presetId === "gamma") {
      // --- 40Hz Gamma Focus: Isochronic Pulse + Binaural Resonance + Deep Brown Noise ---
      
      // 1. Deep Brown Noise backdrop (Real Brownian walk)
      const bSize = ctx.sampleRate * 2;
      const bBuffer = ctx.createBuffer(1, bSize, ctx.sampleRate);
      const bData = bBuffer.getChannelData(0);
      let lastVal = 0;
      for (let i = 0; i < bSize; i++) {
        const white = Math.random() * 2 - 1;
        lastVal = (lastVal + 0.02 * white) / 1.002;
        bData[i] = lastVal * 2.8; // Normalized to audible, rich rumble
      }
      const brown = ctx.createBufferSource();
      brown.buffer = bBuffer;
      brown.loop = true;

      const brownFilter = ctx.createBiquadFilter();
      brownFilter.type = "lowpass";
      brownFilter.frequency.value = 520;

      const brownGain = ctx.createGain();
      brownGain.gain.value = 0.22;

      brown.connect(brownFilter);
      brownFilter.connect(brownGain);
      brownGain.connect(master);
      brown.start();
      activeNodesRef.current.push(brown);

      // 2. 40Hz Isochronic Tone (Audible on ALL laptop speakers and headphones)
      // Carrier tone at 216Hz (calm harmonic A3)
      const carrier = ctx.createOscillator();
      carrier.type = "sine";
      carrier.frequency.value = 216;

      // 40Hz Amplitude Modulator (Gamma Rhythm)
      const pulseLfo = ctx.createOscillator();
      pulseLfo.type = "sine";
      pulseLfo.frequency.value = 40; // 40 cycles per second

      const pulseDepth = ctx.createGain();
      pulseDepth.gain.value = 0.08; // modulation depth
      pulseLfo.connect(pulseDepth);

      const isochronicGain = ctx.createGain();
      isochronicGain.gain.value = 0.16; // base volume
      pulseDepth.connect(isochronicGain.gain);

      carrier.connect(isochronicGain);
      isochronicGain.connect(master);

      carrier.start();
      pulseLfo.start();
      activeNodesRef.current.push(carrier, pulseLfo);

      // 3. Stereo Binaural 40Hz Delta for Headphone Users (200Hz L / 240Hz R)
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.type = "sine";
      oscR.type = "sine";
      oscL.frequency.value = 200;
      oscR.frequency.value = 240; // 40Hz difference

      const merger = ctx.createChannelMerger(2);
      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);

      const binauralGain = ctx.createGain();
      binauralGain.gain.value = 0.12;

      merger.connect(binauralGain);
      binauralGain.connect(master);

      oscL.start();
      oscR.start();
      activeNodesRef.current.push(oscL, oscR);

    } else if (presetId === "wind") {
      // --- Hunter's Night Wind: Sweeping Nocturnal Atmosphere ---
      const bSize = ctx.sampleRate * 3;
      const bBuffer = ctx.createBuffer(1, bSize, ctx.sampleRate);
      const bData = bBuffer.getChannelData(0);
      for (let i = 0; i < bSize; i++) {
        bData[i] = Math.random() * 2 - 1;
      }
      const windSource = ctx.createBufferSource();
      windSource.buffer = bBuffer;
      windSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 380;
      windFilter.Q.value = 2.2;

      // LFO for breathing wind gust
      const windLfo = ctx.createOscillator();
      windLfo.frequency.value = 0.11;
      const windLfoGain = ctx.createGain();
      windLfoGain.gain.value = 220;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);
      windLfo.start();
      activeNodesRef.current.push(windLfo);

      const windGain = ctx.createGain();
      windGain.gain.value = 0.24;

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start();
      activeNodesRef.current.push(windSource);
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      await startAudio(activePreset.id);
      setIsPlaying(true);
    }
  };

  const selectPreset = async (p: SoundPreset) => {
    setActivePreset(p);
    setElapsedSeconds(0);
    if (isPlaying) {
      await startAudio(p.id);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const fmtTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="lofi-deck-container">
      {/* Deck Hero: Vinyl Turntable & Control Panel */}
      <div className="lofi-deck-main">
        {/* Turntable Platter */}
        <div className="lofi-turntable-zone">
          <div className="lofi-platter">
            {/* Spinning Vinyl Record */}
            <div className={`lofi-vinyl ${isPlaying ? "spinning" : ""}`}>
              <div className="vinyl-groove-ring ring-1" />
              <div className="vinyl-groove-ring ring-2" />
              <div className="vinyl-groove-ring ring-3" />
              <div className="vinyl-label">
                <span className="vinyl-rpm mono">{activePreset.rpm} RPM</span>
                <span className="vinyl-badge mono">DAYMARK</span>
              </div>
            </div>

            {/* Tonearm & Needle */}
            <div className={`lofi-tonearm ${isPlaying ? "playing" : ""}`}>
              <div className="tonearm-base" />
              <div className="tonearm-arm" />
              <div className="tonearm-cartridge" />
            </div>
          </div>
        </div>

        {/* Track Info & Visualizer Deck */}
        <div className="lofi-controls-zone">
          <div className="lofi-meta-header">
            <div className="lofi-tag-row mono">
              <span className="lofi-genre-pill">{activePreset.genre}</span>
              <span className="lofi-status-pill mono">
                {isPlaying ? (
                  <>
                    <span className="live-dot" /> PLAYING
                  </>
                ) : (
                  "OFFLINE AUDIO DECK"
                )}
              </span>
            </div>
            <h3 className="lofi-track-title">{activePreset.name}</h3>
            <p className="lofi-track-desc">{activePreset.desc}</p>
          </div>

          {/* Sound Visualizer & Time Counter */}
          <div className="lofi-meter-row mono">
            <div className={`lofi-eq-visualizer ${isPlaying ? "active" : ""}`}>
              <span className="eq-bar bar-1" />
              <span className="eq-bar bar-2" />
              <span className="eq-bar bar-3" />
              <span className="eq-bar bar-4" />
              <span className="eq-bar bar-5" />
            </div>
            <div className="lofi-timer-readout">
              <span className="timer-digits">{fmtTime(elapsedSeconds)}</span>
              <span className="timer-fmt">STEREO 44.1kHz</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="lofi-transport-row">
            <button
              type="button"
              className={`lofi-play-btn ${isPlaying ? "active" : ""}`}
              onClick={togglePlay}
              title={isPlaying ? "Pause audio" : "Play ambient focus audio"}
            >
              {isPlaying ? "❚❚ Pause" : "▶ Start Lo-Fi Deck"}
            </button>

            {/* Volume Control */}
            <div className="lofi-vol-group mono">
              <button
                type="button"
                className="lofi-mute-btn"
                onClick={() => setIsMuted((m) => !m)}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="lofi-vol-slider"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Preset Sound Selectors */}
          <div className="lofi-presets-bar">
            <span className="lofi-presets-lbl mono">Channel:</span>
            <div className="lofi-presets-list">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`lofi-preset-btn mono ${activePreset.id === p.id ? "active" : ""}`}
                  onClick={() => selectPreset(p)}
                >
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
