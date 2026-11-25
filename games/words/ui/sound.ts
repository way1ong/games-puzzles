// Quiet sounds made by the game itself (no files): a soft tap when a word is found, two notes for a bonus word,
// a short rising chord when the level is done. Off unless the player switches the sound on; the browser lets a
// page play only after a tap, and every sound here follows one.

/** Notes as semitones from A4 (the tuning pitch below), from the C major chord: soft and never sharp. */
const NOTES = { found: [3], bonus: [7, 10], done: [3, 7, 10, 15] } as const;
const A4_HZ = 440;
/** How loud (0–1) and how long each note sounds, and the gap between the notes of a chord, s. */
const VOLUME = 0.06;
const NOTE_S = 0.16;
const STEP_S = 0.09;

export type SoundKind = keyof typeof NOTES;

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

export function playSound(kind: SoundKind): void {
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  NOTES[kind].forEach((semitones, i) => {
    const start = ctx.currentTime + i * STEP_S;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = A4_HZ * 2 ** (semitones / 12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(VOLUME, start + NOTE_S / 8);
    gain.gain.exponentialRampToValueAtTime(VOLUME / 100, start + NOTE_S);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + NOTE_S);
  });
}
