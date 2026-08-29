/**
 * Browser-native Web Audio Soundscape Generator.
 *
 * Generates continuous focus audio (Rain, Pink Noise, Warm Lo-Fi Ambient Drone)
 * purely in-browser with zero network requests or audio assets.
 */

export type SoundscapeType = "rain" | "pink" | "drone" | "off";

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

    // Brown noise with sporadic droplet spikes
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5; // boost
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to sound like soft rainfall on a roof
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

    // Harmonic warm ambient frequencies: Root + 5th + 9th (e.g. D2 73.4Hz, A2 110Hz, E3 164.8Hz)
    const freqs = [73.42, 110.0, 164.81];

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);

      // Low frequency tremolo modulation
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
}

export const soundscape = typeof window !== "undefined" ? new SoundscapeEngine() : null;
