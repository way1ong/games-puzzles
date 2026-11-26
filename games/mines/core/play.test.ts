// A game: the first place opens a patch; a closed cell opens, an empty one opens its neighbours; flags; a number with
// its flags opens the rest; a mine — start over, or take the move back; the last safe cell wins and flags the mines;
// the mines left; the player's first place; the hint — wrong flags first, its steps lead a field to the end.
import { describe, expect, it } from 'vitest';
import { LEVELS, MINES } from '../config.ts';
import { mineMap, neighbourTable, numbers, type Field } from './field.ts';
import { applyHint, findHint } from './hint.ts';
import { makeField } from './make.ts';
import {
  CLOSED_CELL,
  FLAG,
  OPEN,
  afterMine,
  aroundNumber,
  countHint,
  minesLeft,
  newPlay,
  openAround,
  openCell,
  started,
  startOver,
  toggleFlag,
  withField,
  type MinesPlay,
} from './play.ts';
import { emptyStats, longestStreak, recordPlayed, recordWon } from './stats.ts';
import { finishTask } from './task.ts';

const fieldOf = (seed: number) => finishTask(makeField('easy', seed));
const closedSafe = (play: MinesPlay, field: Field) => {
  const mine = mineMap(field);
  return [...play.cells].map((c, i) => i).filter((i) => play.cells[i] === CLOSED_CELL && !mine[i]);
};

describe('a game', () => {
  it('the first place opens a patch: it shows 0, its neighbours are open', () => {
    const field = fieldOf(1);
    const play = newPlay('easy', 1, 'game', field);
    expect(play.cells[field.start]).toBe(OPEN);
    expect(numbers(field)[field.start]).toBe(0);
    for (const o of neighbourTable(field)[field.start]!) expect(play.cells[o]).toBe(OPEN);
    expect(started(play)).toBe(false);
  });

  it('flags go on closed cells and come off; a flagged cell does not open; the mines left count the flags', () => {
    const field = fieldOf(2);
    const play = newPlay('easy', 2, 'game', field);
    const cell = field.mines[0]!;
    const flagged = toggleFlag(play, cell);
    expect(flagged.cells[cell]).toBe(FLAG);
    expect(minesLeft(flagged, field.mines.length)).toBe(field.mines.length - 1);
    expect(openCell(flagged, cell)).toBe(flagged);
    expect(toggleFlag(flagged, cell).cells[cell]).toBe(CLOSED_CELL);
    expect(toggleFlag(play, field.start)).toBe(play);
    expect(started(flagged)).toBe(true);
  });

  it('a mine: start over — the same field from its first place, a new try', () => {
    const field = fieldOf(3);
    let play = countHint(newPlay('easy', 3, 'game', field));
    play = openCell(play, field.mines[0]!);
    expect(play.boom).toBe(field.mines[0]);
    expect(openCell(play, closedSafe(play, field)[0]!)).toBe(play);
    const again = afterMine(play, 'restart');
    expect(again).toEqual(newPlay('easy', 3, 'game', field));
    expect(startOver(play)).toEqual(again);
  });

  it('a mine: take the move back — the game goes on, a mistake counted', () => {
    const field = fieldOf(4);
    const play = newPlay('easy', 4, 'game', field);
    const boom = openCell(play, field.mines[1]!);
    const back = afterMine(boom, 'undo');
    expect(back.cells).toBe(play.cells);
    expect(back.boom).toBeNull();
    expect(back.mistakes).toBe(1);
  });

  it('a number with as many flags as it says opens the rest of its neighbours; a wrong flag opens a mine', () => {
    for (let seed = 5; seed < 40; seed++) {
      const field = fieldOf(seed);
      const play = newPlay('easy', seed, 'game', field);
      const mine = mineMap(field);
      const nums = numbers(field);
      // an open number next to a mine and to a closed safe cell
      const cell = [...play.cells].findIndex((c, i) => {
        if (c !== OPEN || nums[i] !== 1) return false;
        const around = neighbourTable(field)[i]!;
        return around.some((o) => mine[o]) && around.some((o) => !mine[o] && play.cells[o] === CLOSED_CELL);
      });
      if (cell < 0) continue;
      const its = [...neighbourTable(field)[cell]!];
      const theMine = its.find((o) => mine[o])!;
      const right = openAround(toggleFlag(play, theMine), cell);
      expect(aroundNumber(right, cell)!.closed).toEqual([]);
      expect(right.boom).toBeNull();
      // the flag on a safe cell instead: the mine opens
      const wrongCell = its.find((o) => !mine[o] && play.cells[o] === CLOSED_CELL)!;
      const wrong = openAround(toggleFlag(play, wrongCell), cell);
      expect(wrong.boom).toBe(theMine);
      return;
    }
    throw new Error('no number to try');
  });

  it('the last safe cell wins, and the game flags the mines itself', () => {
    const field = fieldOf(6);
    let play = newPlay('easy', 6, 'game', field);
    for (const cell of closedSafe(play, field)) play = openCell(play, cell);
    expect(play.done).toBe(true);
    const mine = mineMap(field);
    for (let cell = 0; cell < play.cells.length; cell++) expect(play.cells[cell]).toBe(mine[cell] ? FLAG : OPEN);
    expect(minesLeft(play, field.mines.length)).toBe(0);
    expect(openCell(play, field.mines[0]!)).toBe(play);
  });

  it('the player\'s first place: no field until then; then it is made around the place and opens', () => {
    const play = newPlay('easy', 7, 'player', null);
    expect(play.field).toBeNull();
    expect(openCell(play, 0)).toBe(play);
    const field = finishTask(makeField('easy', 7, 0));
    const now = withField(play, field);
    expect(now.cells[0]).toBe(OPEN);
    expect(now.boom).toBeNull();
  });
});

describe('the hint', () => {
  it('wrong flags first; doing it takes them off', () => {
    const field = fieldOf(8);
    const play = newPlay('easy', 8, 'game', field);
    const safe = closedSafe(play, field)[0]!;
    const flagged = toggleFlag(play, safe);
    const hint = findHint(flagged)!;
    expect(hint).toEqual({ kind: 'wrongFlags', cells: [safe] });
    expect(applyHint(flagged, hint).cells).toBe(play.cells);
  });

  it('its steps lead every level to the end, never to a mine and never only to "safe here"', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 4; seed++) {
        const field = finishTask(makeField(level, seed));
        let play = newPlay(level, seed, 'game', field);
        for (let i = 0; i < 2000 && !play.done; i++) {
          const hint = findHint(play)!;
          expect(hint.kind).toBe('step');
          const next = applyHint(play, hint);
          expect(next.boom).toBeNull();
          expect(next).not.toBe(play);
          play = next;
        }
        expect(play.done).toBe(true);
      }
    }
  });

  it('the simplest step first: one number before two, two before all of them', () => {
    const field = finishTask(makeField('hard', 11));
    let play = newPlay('hard', 11, 'game', field);
    const kinds = new Set<string>();
    while (!play.done) {
      const hint = findHint(play)!;
      if (hint.kind !== 'step') throw new Error(hint.kind);
      kinds.add(hint.step.logic);
      play = applyHint(play, hint);
    }
    expect(kinds.has('single')).toBe(true);
    expect(MINES.levels.hard.logic).toBe('all');
  });

  it('before the player chooses the first place: anywhere', () => {
    expect(findHint(newPlay('easy', 9, 'player', null))).toEqual({ kind: 'choose' });
  });
});

describe('statistics', () => {
  it('played, won, won clean, the best time; the longest run of days', () => {
    const field = fieldOf(10);
    let play = newPlay('easy', 10, 'game', field);
    for (const cell of closedSafe(play, field)) play = openCell(play, cell);
    let stats = recordWon(emptyStats(), { ...play, ms: 5000 });
    stats = recordWon(stats, { ...play, ms: 4000, hints: 1 });
    stats = recordPlayed(stats, 'easy');
    expect(stats.easy).toEqual({ played: 3, won: 2, clean: 1, bestMs: 4000 });
    expect(stats.hard).toEqual({ played: 0, won: 0, clean: 0, bestMs: null });
    expect(longestStreak(['2026-11-24', '2026-11-25', '2026-11-27', '2026-11-26', '2026-11-20'])).toBe(4);
  });
});
