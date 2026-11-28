// The sounds of the games (decision of 28.11, «Давай звук»): short and quiet, made by the game itself — no sound files,
// nothing from the network. Each sound is a score: tones and bands of noise, each with its own loudness from its start
// to its end (a curve). Pure: the scores are numbers; shared/ui/sound.ts plays them with the browser's audio.
//
// Pitches stay in the middle range (C): high tones are the first that older ears stop hearing.

/** The sounds every game draws from. */
export const SOUND_NAMES = ['tap', 'card', 'pour', 'success', 'win', 'refuse'] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

/** A tone: a wave whose pitch goes from one frequency to another (Hz). */
export interface Tone {
  kind: 'tone';
  wave: 'sine' | 'triangle';
  from: number;
  to: number;
  /** Start and length, seconds. */
  at: number;
  length: number;
  /** Loudness over the length, evenly spaced, 0 … 1 of the full scale. */
  curve: number[];
}

/**
 * Noise through a band (Hz) that moves from one frequency to another; `q` — how narrow the band is. A band lets through
 * only part of the noise, so the player makes noise louder (shared/ui/sound.ts, NOISE_BOOST).
 */
export interface Noise {
  kind: 'noise';
  from: number;
  to: number;
  q: number;
  at: number;
  length: number;
  curve: number[];
}

export type Part = Tone | Noise;

/** What a sound may change: how much water a pour carries (layers). */
export interface SoundOptions {
  amount?: number;
}

/** Points in a loudness curve, per second of sound (C): smooth enough, small enough. */
const POINTS_PER_SECOND = 200;
/** The loudest a sound may get at any moment, all its parts together (C): the sounds stay quiet. */
export const LOUDEST = 0.3;
/** The longest sound, seconds (C): the melody of a win. */
export const LONGEST = 1.2;

/** A quick rise and a long fall to silence (no click at either end). */
function strike(length: number, peak: number, attack = 0.006): number[] {
  const n = Math.max(8, Math.round(length * POINTS_PER_SECOND));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * length;
    const v = t < attack ? peak * (t / attack) : peak * Math.exp((-5 * (t - attack)) / Math.max(length - attack, 0.001));
    out.push(i === n - 1 ? 0 : v);
  }
  return out;
}

/** A soft swell and fade with a ripple (water bubbling): `rate` ripples a second. */
function gurgle(length: number, peak: number, rate: number): number[] {
  const n = Math.max(8, Math.round(length * POINTS_PER_SECOND));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const shape = Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 0.7;
    const ripple = 0.65 + 0.35 * Math.sin(2 * Math.PI * rate * p * length);
    out.push(i === 0 || i === n - 1 ? 0 : peak * shape * ripple);
  }
  return out;
}

const tone = (wave: Tone['wave'], from: number, to: number, at: number, length: number, peak: number): Tone => ({
  kind: 'tone',
  wave,
  from,
  to,
  at,
  length,
  curve: strike(length, peak),
});

/** A bell-like note: the tone and, quieter, its octave. */
const bell = (pitch: number, at: number, length: number, peak: number): Part[] => [
  tone('sine', pitch, pitch, at, length, peak),
  tone('sine', pitch * 2, pitch * 2, at, length * 0.6, peak * 0.3),
];

/** The score of a sound. */
export function soundScore(name: SoundName, options: SoundOptions = {}): Part[] {
  switch (name) {
    // a move: a soft, short knock
    case 'tap':
      return [tone('sine', 700, 520, 0, 0.05, 0.16)];
    // a card slides and lands: a brush of noise, then a low touch
    case 'card':
      return [
        { kind: 'noise', from: 2400, to: 1300, q: 0.9, at: 0, length: 0.07, curve: strike(0.07, 0.09, 0.012) },
        tone('sine', 170, 140, 0.055, 0.04, 0.07),
      ];
    // water poured: bubbling noise whose pitch rises as the bottle fills; longer the more it carries
    case 'pour': {
      const layers = Math.max(1, Math.min(4, options.amount ?? 1));
      const length = 0.22 + 0.09 * layers;
      return [
        { kind: 'noise', from: 420, to: 1100, q: 2.2, at: 0, length, curve: gurgle(length, 0.26, 14) },
        tone('sine', 520, 760, length * 0.3, 0.035, 0.04),
        tone('sine', 600, 880, length * 0.65, 0.035, 0.04),
      ];
    }
    // something done (a bottle full of one colour, a run home): two bell notes going up
    case 'success':
      return [...bell(523.25, 0, 0.32, 0.13), ...bell(783.99, 0.11, 0.42, 0.13)];
    // solved: a short melody going up
    case 'win':
      return [
        ...bell(523.25, 0, 0.3, 0.12),
        ...bell(659.25, 0.13, 0.3, 0.12),
        ...bell(783.99, 0.26, 0.3, 0.12),
        ...bell(1046.5, 0.39, 0.75, 0.12),
      ];
    // not allowed: a low, soft "no"
    case 'refuse':
      return [tone('triangle', 220, 165, 0, 0.13, 0.13)];
  }
}

/** How long a sound lasts, seconds. */
export const soundLength = (parts: readonly Part[]): number => Math.max(0, ...parts.map((p) => p.at + p.length));

/** The loudest moment of a sound: every part's curve added up where they sound together (sampled). */
export function loudestOf(parts: readonly Part[]): number {
  const total = soundLength(parts);
  let most = 0;
  for (let t = 0; t <= total; t += 1 / POINTS_PER_SECOND) {
    let sum = 0;
    for (const p of parts) {
      if (t < p.at || t > p.at + p.length) continue;
      const k = Math.min(p.curve.length - 1, Math.round(((t - p.at) / p.length) * (p.curve.length - 1)));
      sum += p.curve[k]!;
    }
    most = Math.max(most, sum);
  }
  return most;
}
