// Plays the games' sounds (shared/core/sounds.ts) with the browser's own audio (Web Audio): no files, nothing from the
// network. Off unless the player switches it on (rule 6); nothing at all is set up until a sound is first played.
// Browsers let a page start sound only after the player touches it, so the audio wakes on a touch (the switch itself,
// or any move). On iPhone and iPad the sounds follow the silent switch and mix with other sound ("ambient").
import { soundLength, soundScore, type SoundName, type SoundOptions } from '../core/sounds.ts';

/** The whole of the games' sound, quieter still than the scores (C). */
const VOLUME = 0.8;
/**
 * Noise through a band is quieter than a tone of the same loudness (the band lets only part of it through): this much
 * louder, so a pour sounds about as loud as a knock (C, measured in a browser).
 */
const NOISE_BOOST = 2.5;
/** A part ends this long after its curve, so its last value is reached before it stops, seconds. */
const TAIL = 0.02;

type AudioContextClass = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audioClass(): AudioContextClass | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** The audio, set up on first use and woken if the browser has put it to sleep; null — the browser has none. */
function audio(): AudioContext | null {
  const Ctor = audioClass();
  if (!Ctor) return null;
  if (!ctx) {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    try {
      if (session) session.type = 'ambient';
    } catch {
      // the browser keeps its own way
    }
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
    // a second of noise for the noisy sounds (a fixed sequence, the same every time)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let state = 0x2545f491;
    for (let i = 0; i < data.length; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      data[i] = state / 2147483648 - 1;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

/** Plays a sound `delay` seconds from now; its length, seconds (0 — no sound). */
function schedule(name: SoundName, options: SoundOptions, delay: number): number {
  const a = audio();
  if (!a || !master || !noise) return 0;
  const start = a.currentTime + 0.005 + Math.max(0, delay);
  const parts = soundScore(name, options);
  for (const part of parts) {
    const t0 = start + part.at;
    const t1 = t0 + part.length;
    const gain = a.createGain();
    // silent until the curve starts (a plain value: an automation event at the curve's start would clash with it)
    gain.gain.value = 0;
    const boost = part.kind === 'noise' ? NOISE_BOOST : 1;
    gain.gain.setValueCurveAtTime(Float32Array.from(part.curve, (v) => v * boost), t0, part.length);
    gain.connect(master);
    if (part.kind === 'tone') {
      const osc = a.createOscillator();
      osc.type = part.wave;
      osc.frequency.setValueAtTime(part.from, t0);
      if (part.to !== part.from) osc.frequency.exponentialRampToValueAtTime(part.to, t1);
      osc.connect(gain);
      osc.start(t0);
      osc.stop(t1 + TAIL);
    } else {
      const src = a.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const band = a.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = part.q;
      band.frequency.setValueAtTime(part.from, t0);
      if (part.to !== part.from) band.frequency.exponentialRampToValueAtTime(part.to, t1);
      src.connect(band);
      band.connect(gain);
      src.start(t0, (part.at * 7919) % 0.5);
      src.stop(t1 + TAIL);
    }
  }
  return soundLength(parts);
}

export interface Sounds {
  /**
   * Plays a sound, `delay` seconds from now, if the player has the sound on; how long it lasts, seconds (0 — none), so
   * that a sound can follow it.
   */
  play(name: SoundName, options?: SoundOptions, delay?: number): number;
  /** The sound was just switched on (a touch): the audio wakes, and a soft sound says it is on. */
  switchedOn(): void;
}

/** The sounds of a game; `on` — whether the player has them on now. */
export function createSounds(on: () => boolean): Sounds {
  // a touch wakes the audio, so a sound that follows a moment later (a win after the cards fly) plays too
  const wake = () => {
    if (on() && ctx) audio();
  };
  if (typeof document !== 'undefined') document.addEventListener('pointerdown', wake, { capture: true, passive: true });
  return {
    play(name, options = {}, delay = 0) {
      if (!on()) return 0;
      try {
        return schedule(name, options, delay);
      } catch {
        // no sound rather than a broken game
        return 0;
      }
    },
    switchedOn() {
      try {
        schedule('tap', {}, 0);
      } catch {
        // no sound rather than a broken game
      }
    },
  };
}
