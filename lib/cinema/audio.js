import { getMoodMeta } from "./presets";

/**
 * Lightweight Web Audio ambient cinema score synthesizer.
 * Generates warm analog tape pad chords + subtle projector room texture
 * without requiring external audio files.
 */
export class DreamAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.nodes = [];
    this.bellTimer = null;
    this.isPlaying = false;
  }

  start(moodId = "怀旧", volume = 0.22) {
    if (typeof window === "undefined") return;
    this.stop();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(Math.max(0.01, volume), ctx.currentTime + 1.8);
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(620, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);
    filter.connect(master);

    const mood = getMoodMeta(moodId);
    const freqs = mood.chord || [220, 277.18, 329.63, 415.3];

    // Warm detuned ambient pad oscillators
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq / 2, ctx.currentTime);
      osc.detune.setValueAtTime((idx - 1.5) * 6, ctx.currentTime);
      gain.gain.setValueAtTime(0.14 / freqs.length, ctx.currentTime);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.nodes.push(osc, gain);
    });

    // Subtle analog tape / rain room air texture
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.8;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(900, ctx.currentTime);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.055, ctx.currentTime);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    this.nodes.push(noise, noiseFilter, noiseGain);

    // Occasional soft dreamy piano/bell harmonic overtone
    const playHarmonic = () => {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const pick = freqs[Math.floor(Math.random() * freqs.length)] * (Math.random() > 0.5 ? 1 : 2);
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(pick, now);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(0.06, now + 0.08);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(env);
      env.connect(filter);
      osc.start(now);
      osc.stop(now + 3.4);
    };

    this.ctx = ctx;
    this.master = master;
    this.isPlaying = true;
    playHarmonic();
    this.bellTimer = window.setInterval(playHarmonic, 3600);
  }

  stop() {
    this.isPlaying = false;
    if (this.bellTimer) {
      window.clearInterval(this.bellTimer);
      this.bellTimer = null;
    }
    if (this.ctx && this.master) {
      try {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
        this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        const closingCtx = this.ctx;
        window.setTimeout(() => {
          closingCtx.close().catch(() => {});
        }, 420);
      } catch {
        // ignore close errors
      }
    }
    this.ctx = null;
    this.master = null;
    this.nodes = [];
  }
}
