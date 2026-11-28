// The sounds (decision of 28.11): every sound is short and quiet, starts and ends in silence (no click), keeps its
// tones in the middle range; a pour lasts longer the more water it carries; the melody of a win goes up.
import { describe, expect, it } from 'vitest';
import { LONGEST, LOUDEST, SOUND_NAMES, loudestOf, soundLength, soundScore, type Tone } from './sounds.ts';

describe('the sounds', () => {
  it('are short and quiet, all their parts together', () => {
    for (const name of SOUND_NAMES) {
      const parts = soundScore(name);
      expect(parts.length, name).toBeGreaterThan(0);
      expect(soundLength(parts), name).toBeLessThanOrEqual(LONGEST);
      expect(loudestOf(parts), name).toBeLessThanOrEqual(LOUDEST);
      expect(loudestOf(parts), name).toBeGreaterThan(0.05);
    }
    expect(loudestOf(soundScore('pour', { amount: 4 }))).toBeLessThanOrEqual(LOUDEST);
  });

  it('start and end every part in silence', () => {
    for (const name of SOUND_NAMES) {
      for (const p of soundScore(name)) {
        expect(p.curve[0], name).toBeLessThan(0.02);
        expect(p.curve[p.curve.length - 1], name).toBe(0);
        expect(p.curve.every((v) => v >= 0 && v <= LOUDEST)).toBe(true);
      }
    }
  });

  it('keep their pitches in the middle range', () => {
    for (const name of SOUND_NAMES) {
      for (const p of soundScore(name)) {
        for (const f of [p.from, p.to]) {
          expect(f, name).toBeGreaterThanOrEqual(100);
          expect(f, name).toBeLessThanOrEqual(p.kind === 'tone' ? 2100 : 2600);
        }
      }
    }
  });

  it('pour longer the more water a pour carries', () => {
    expect(soundLength(soundScore('pour', { amount: 3 }))).toBeGreaterThan(soundLength(soundScore('pour', { amount: 1 })));
  });

  it('end a solved game with notes going up', () => {
    const notes = soundScore('win').filter((p): p is Tone => p.kind === 'tone' && p.length > 0.25);
    const pitches = notes.sort((a, b) => a.at - b.at).map((t) => t.from);
    expect(pitches.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < pitches.length; i++) expect(pitches[i]!).toBeGreaterThan(pitches[i - 1]!);
  });
});
