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
    desc: "Isochronic cognitive frequency over brown study noise",
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

  // Stop current audio nodes
  const stopAudio = () => {
    for (const node of activeNodesRef.current) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    }
    activeNodesRef.current = [];
  };

  // Build audio synthesizer according to preset
  const startAudio = (presetId: string) => {
    stopAudio();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContextClass();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const master = ctx.createGain();
    master.gain.value = isMuted ? 0 : volume;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    if (presetId === "rain") {
      // 1. Rain noise generator
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.15;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "lowpass";
      rainFilter.frequency.value = 1200;

      whiteNoise.connect(rainFilter);
      rainFilter.connect(master);
      whiteNoise.start();
      activeNodesRef.current.push(whiteNoise);

      // 2. Vinyl needle crackle generator
      const crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const cOut = crackleBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Random sparse impulse spikes
        cOut[i] = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.8 : 0;
      }
      const crackle = ctx.createBufferSource();
      crackle.buffer = crackleBuffer;
      crackle.loop = true;

      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = "highpass";
      crackleFilter.frequency.value = 2200;

      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0.35;

      crackle.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(master);
      crackle.start();
      activeNodesRef.current.push(crackle);

    } else if (presetId === "chords") {
      // Warm analog chord drone (Fmaj7 - A, C, E, G)
      const freqs = [174.61, 220.0, 261.63, 329.63, 392.0];
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.18;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 850;

      // Subtle LFO for tape flutter
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.35;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 15;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      activeNodesRef.current.push(lfo);

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start();
        activeNodesRef.current.push(osc);
      });

      filter.connect(oscGain);
      oscGain.connect(master);

    } else if (presetId === "gamma") {
      // 40Hz focus binaural resonance
      const baseFreq = 160;
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.type = "sine";
      oscR.type = "sine";
      oscL.frequency.value = baseFreq;
      oscR.frequency.value = baseFreq + 40; // 40Hz difference

      const merger = ctx.createChannelMerger(2);
      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);

      const focusGain = ctx.createGain();
      focusGain.gain.value = 0.15;

      merger.connect(focusGain);
      focusGain.connect(master);

      oscL.start();
      oscR.start();
      activeNodesRef.current.push(oscL, oscR);

      // Low brown noise backdrop
      const bSize = ctx.sampleRate * 2;
      const bBuffer = ctx.createBuffer(1, bSize, ctx.sampleRate);
      const bData = bBuffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bSize; i++) {
        const white = Math.random() * 2 - 1;
        bData[i] = (last + 0.02 * white) / 1.02;
        last = bData[i];
        bData[i] *= 0.8;
      }
      const brown = ctx.createBufferSource();
      brown.buffer = bBuffer;
      brown.loop = true;
      const brownGain = ctx.createGain();
      brownGain.gain.value = 0.08;
      brown.connect(brownGain);
      brownGain.connect(master);
      brown.start();
      activeNodesRef.current.push(brown);

    } else if (presetId === "wind") {
      // Wind sweep noise
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
      windFilter.frequency.value = 400;
      windFilter.Q.value = 2.5;

      // LFO for breathing wind gust
      const windLfo = ctx.createOscillator();
      windLfo.frequency.value = 0.12;
      const windLfoGain = ctx.createGain();
      windLfoGain.gain.value = 250;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);
      windLfo.start();
      activeNodesRef.current.push(windLfo);

      const windGain = ctx.createGain();
      windGain.gain.value = 0.22;

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start();
      activeNodesRef.current.push(windSource);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      startAudio(activePreset.id);
      setIsPlaying(true);
    }
  };

  const selectPreset = (p: SoundPreset) => {
    setActivePreset(p);
    setElapsedSeconds(0);
    if (isPlaying) {
      startAudio(p.id);
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
