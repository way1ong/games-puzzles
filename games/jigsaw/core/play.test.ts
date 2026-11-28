import { describe, expect, it } from 'vitest';
import { JIGSAW } from '../config.ts';
import { kindOf } from './cut.ts';
import { addTime, clean, countHint, drop, hintOf, nearHome, newPlay, piecesOf, place, started, trayOf, validPlay, type JigsawPlay } from './play.ts';

const fresh = (): JigsawPlay => newPlay('free', 'easy', 123, 2);

/** The middle of a piece's place on the board. */
const middle = (piece: number, cols = 6) => ({ x: (piece % cols) + 0.5, y: Math.floor(piece / cols) + 0.5 });

describe('a puzzle', () => {
  it('starts with every piece in the tray', () => {
    const play = fresh();
    expect(play.placed).toEqual([]);
    expect(play.done).toBe(false);
    expect(play.daily).toBeNull();
    expect(piecesOf(play)).toBe(24);
    expect(trayOf(play)).toHaveLength(24);
    expect(started(play)).toBe(false);
    expect(validPlay(play)).toBe(true);
  });

  it('takes a piece let go near its place, and keeps it there', () => {
    const { x, y } = middle(8);
    const next = drop(fresh(), 8, x + 0.4, y - 0.3)!;
    expect(next.placed).toEqual([8]);
    expect(trayOf(next)).not.toContain(8);
    expect(started(next)).toBe(true);
    // a piece in place cannot be put again
    expect(drop(next, 8, x, y)).toBeNull();
  });

  it('sends a piece let go elsewhere back to the tray', () => {
    const { x, y } = middle(8);
    expect(drop(fresh(), 8, x + 1, y)).toBeNull();
    expect(drop(fresh(), 8, x, y + 2)).toBeNull();
  });

  it('snaps up to 3/4 of a side from the middle of the place, and not beyond (config)', () => {
    const { x, y } = middle(14);
    expect(nearHome(6, 14, x + JIGSAW.snap, y - JIGSAW.snap)).toBe(true);
    expect(nearHome(6, 14, x + JIGSAW.snap + 0.01, y)).toBe(false);
    expect(nearHome(6, 14, x, y - JIGSAW.snap - 0.01)).toBe(false);
  });

  it('knows no pieces outside the board', () => {
    expect(place(fresh(), 24)).toBeNull();
    expect(place(fresh(), -1)).toBeNull();
  });

  it('is done when the last piece is in its place, and then takes nothing more', () => {
    let play = fresh();
    for (let p = 0; p < 24; p++) play = place(play, p)!;
    expect(play.done).toBe(true);
    expect(trayOf(play)).toEqual([]);
    expect(hintOf(play)).toBeNull();
    expect(validPlay(play)).toBe(true);
  });

  it('keeps the tray’s order for the pieces left', () => {
    const before = trayOf(fresh());
    const next = place(fresh(), before[3]!)!;
    expect(trayOf(next)).toEqual(before.filter((p) => p !== before[3]));
  });

  it('counts hints; a hint’s piece starts with a corner', () => {
    const play = fresh();
    const piece = hintOf(play)!;
    expect(kindOf(6, 4, piece)).toBe('corner');
    const hinted = countHint(play);
    expect(hinted.hints).toBe(1);
    expect(clean(hinted)).toBe(false);
    expect(clean(play)).toBe(true);
    expect(started(hinted)).toBe(true);
  });

  it('adds time while it is played', () => {
    const play = addTime(fresh(), 1500);
    expect(play.ms).toBe(1500);
    expect(addTime(play, -5).ms).toBe(1500);
    let done = play;
    for (let p = 0; p < 24; p++) done = place(done, p)!;
    expect(addTime(done, 1000).ms).toBe(1500);
  });

  it('of the day keeps its date', () => {
    const play = newPlay('daily', JIGSAW.daily, 5, 0, '2026-11-28');
    expect(play.daily).toBe('2026-11-28');
    expect(piecesOf(play)).toBe(54);
    expect(validPlay(play)).toBe(true);
  });
});

describe('a saved puzzle', () => {
  it('that does not hold together is not continued', () => {
    const play = place(fresh(), 3)!;
    expect(validPlay({ ...play, placed: [3, 3] })).toBe(false);
    expect(validPlay({ ...play, placed: [24] })).toBe(false);
    expect(validPlay({ ...play, done: true })).toBe(false);
    expect(validPlay({ ...play, picture: 6 })).toBe(false);
    expect(validPlay({ ...play, difficulty: 'huge' as never })).toBe(false);
    expect(validPlay({ ...play, way: 'daily' })).toBe(false);
    expect(validPlay({ ...play, hints: -1 })).toBe(false);
    expect(validPlay({ ...play, ms: Number.NaN })).toBe(false);
  });
});
