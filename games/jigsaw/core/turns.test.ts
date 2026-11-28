// Turned pieces (docs/jigsaw/SPEC.md, "Поворот частинок"): how the pieces lie comes from the puzzle's seed — the same
// for the same puzzle, all four ways among them; a turn adds a quarter clockwise and goes round; with turning on, a
// piece goes into its place only standing right, with turning off — as before; a saved puzzle's turns must hold together.
import { describe, expect, it } from 'vitest';
import { JIGSAW } from '../config.ts';
import { drop, newPlay, piecesOf, place, turn, turnOf, validPlay, type JigsawPlay } from './play.ts';
import { QUARTERS, startTurns, turnedOnce, validTurns } from './turns.ts';

/** The middle of a piece's place on the board. */
const middle = (piece: number, cols: number) => ({ x: (piece % cols) + 0.5, y: Math.floor(piece / cols) + 0.5 });

describe('how the pieces lie', () => {
  it('comes from the seed: the same puzzle, the same turns; another puzzle, others', () => {
    expect(startTurns(96, 7)).toEqual(startTurns(96, 7));
    expect(startTurns(96, 7)).not.toEqual(startTurns(96, 8));
    expect(newPlay('free', 'hard', 7, 0).turns).toEqual(startTurns(96, 7));
  });

  it('takes all four ways, and every one is a whole quarter', () => {
    const turns = startTurns(150, 11);
    expect(new Set(turns)).toEqual(new Set([0, 1, 2, 3]));
    expect(validTurns(turns, 150)).toBe(true);
  });

  it('turns a quarter clockwise and goes round', () => {
    expect([0, 1, 2, 3].map(turnedOnce)).toEqual([1, 2, 3, 0]);
    expect(QUARTERS).toBe(4);
  });
});

describe('a turned piece', () => {
  const { cols } = JIGSAW.sizes.easy;
  /** A puzzle whose piece 8 lies turned by one quarter. */
  const turned = (): JigsawPlay => {
    const play = newPlay('free', 'easy', 123, 2);
    return { ...play, turns: play.turns.map((t, i) => (i === 8 ? 1 : t)) };
  };

  it('turns in the tray, a quarter at a time; a piece in its place does not', () => {
    let play = turned();
    play = turn(play, 8)!;
    expect(play.turns[8]).toBe(2);
    play = turn(turn(play, 8)!, 8)!;
    expect(play.turns[8]).toBe(0);
    expect(turn(place(play, 8)!, 8)).toBeNull();
    expect(turn(play, -1)).toBeNull();
    expect(turn(play, piecesOf(play))).toBeNull();
  });

  it('with turning on, goes into its place only standing right', () => {
    const { x, y } = middle(8, cols);
    expect(drop(turned(), 8, x, y, true)).toBeNull();
    const upright = turn(turn(turn(turned(), 8)!, 8)!, 8)!;
    expect(turnOf(upright, 8, true)).toBe(0);
    expect(drop(upright, 8, x, y, true)!.placed).toEqual([8]);
  });

  it('with turning off, stands right and goes into its place as before', () => {
    const { x, y } = middle(8, cols);
    expect(turnOf(turned(), 8, false)).toBe(0);
    expect(drop(turned(), 8, x, y, false)!.placed).toEqual([8]);
    expect(drop(turned(), 8, x, y)!.placed).toEqual([8]);
  });

  it('is counted only in a saved puzzle whose turns hold together', () => {
    const play = turned();
    expect(validPlay(play)).toBe(true);
    expect(validPlay({ ...play, turns: play.turns.slice(1) })).toBe(false);
    expect(validPlay({ ...play, turns: play.turns.map((t, i) => (i === 3 ? 4 : t)) })).toBe(false);
    expect(validPlay({ ...play, turns: play.turns.map((t, i) => (i === 3 ? 0.5 : t)) })).toBe(false);
  });
});
