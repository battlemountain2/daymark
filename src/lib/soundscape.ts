/**
 * Browser-native Web Audio Soundscape Generator.
 *
 * Generates continuous focus audio:
 * - Rain (Brown noise with rooftop filter)
 * - Pink Noise (Full spectrum concentration)
 * - Warm Ambient Drone (Triple-sine harmonic chord)
 * - 40Hz Binaural Beats (Gamma frequency focus for reading)
 * - Lo-Fi Warm Vinyl & Tape Flutter (Analog warmth)
 */

export type SoundscapeType = "rain" | "pink" | "drone" | "binaural" | "lofi" | "off";

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private currentType: SoundscapeType = "off";
  private gainNode: GainNode | null = null;
  private activeNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
    }
  }

  public play(type: SoundscapeType, volume: number = 0.4) {
    if (this.currentType === type && type !== "off") return;
    this.stop();
    if (type === "off") return;

    this.initCtx();
    if (!this.ctx) return;

    this.currentType = type;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    if (type === "rain") {
      this.startRain();
    } else if (type === "pink") {
      this.startPinkNoise();
    } else if (type === "drone") {
      this.startDrone();
    } else if (type === "binaural") {
      this.startBinaural40Hz();
    } else if (type === "lofi") {
      this.startLoFiVinyl();
    }
  }

  public stop() {
    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    }
    this.activeNodes = [];
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch {}
      this.gainNode = null;
    }
    this.currentType = "off";
  }

  public getCurrentType(): SoundscapeType {
    return this.currentType;
  }

  private startRain() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(850, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start(0);

    this.activeNodes.push(whiteNoise, filter);
  }

  private startPinkNoise() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noise.connect(this.gainNode);
    noise.start(0);

    this.activeNodes.push(noise);
  }

  private startDrone() {
    if (!this.ctx || !this.gainNode) return;
    const freqs = [73.42, 110.0, 164.81];

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.08 + Math.random() * 0.05, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.3 / freqs.length, this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);

      osc.start(0);
      lfo.start(0);

      this.activeNodes.push(osc, lfo, lfoGain, oscGain);
    }
  }

  /**
   * 40Hz Gamma Focus Frequency:
   * Left ear: 200 Hz
   * Right ear: 240 Hz
   * Difference: 40 Hz binaural beat for deep cognitive processing
   */
  private startBinaural40Hz() {
    if (!this.ctx || !this.gainNode) return;

    const merger = this.ctx.createChannelMerger(2);

    // Left Ear
    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = "sine";
    oscLeft.frequency.setValueAtTime(200, this.ctx.currentTime);
    const gainLeft = this.ctx.createGain();
    gainLeft.gain.setValueAtTime(0.18, this.ctx.currentTime);
    oscLeft.connect(gainLeft);
    gainLeft.connect(merger, 0, 0);

    // Right Ear
    const oscRight = this.ctx.createOscillator();
    oscRight.type = "sine";
    oscRight.frequency.setValueAtTime(240, this.ctx.currentTime);
    const gainRight = this.ctx.createGain();
    gainRight.gain.setValueAtTime(0.18, this.ctx.currentTime);
    oscRight.connect(gainRight);
    gainRight.connect(merger, 0, 1);

    merger.connect(this.gainNode);

    oscLeft.start(0);
    oscRight.start(0);

    this.activeNodes.push(oscLeft, oscRight, gainLeft, gainRight, merger);
  }

  /**
   * Lo-Fi Warm Vinyl & Tape Flutter:
   * Ambient vinyl dust clicks + warm sub bass foundation
   */
  private startLoFiVinyl() {
    if (!this.ctx || !this.gainNode) return;

    // Vinyl crackle simulation
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      if (Math.random() < 0.0006) {
        output[i] = (Math.random() * 2 - 1) * 0.7; // Vinyl pop
      } else {
        output[i] = (Math.random() * 2 - 1) * 0.015; // Surface noise
      }
    }

    const vinylNoise = this.ctx.createBufferSource();
    vinylNoise.buffer = noiseBuffer;
    vinylNoise.loop = true;

    // Warm tape flutter oscillator
    const warmSub = this.ctx.createOscillator();
    warmSub.type = "triangle";
    warmSub.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note warm hum

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    warmSub.connect(subGain);
    subGain.connect(this.gainNode);

    const vinylGain = this.ctx.createGain();
    vinylGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    vinylNoise.connect(vinylGain);
    vinylGain.connect(this.gainNode);

    vinylNoise.start(0);
    warmSub.start(0);

    this.activeNodes.push(vinylNoise, warmSub, subGain, vinylGain);
  }
}

export const soundscape = typeof window !== "undefined" ? new SoundscapeEngine() : null;
