import { describe, expect, it } from 'vitest';
import { dailySeed } from './daily.ts';
import {
  addTime,
  applyHint,
  askHint,
  clearCell,
  fillNotes,
  filledCount,
  isFull,
  isGiven,
  newGame,
  placeDigit,
  redo,
  remaining,
  repeatedCells,
  toggleNote,
  undo,
  wrongCells,
  type Game,
} from './game.ts';
import { makePuzzle } from './generate.ts';
import { PEERS, bit, candidatesOf, parseGrid } from './grid.ts';
import { emptyStats, recordSolved } from './stats.ts';

const ON = { autoNotes: true };
const OFF = { autoNotes: false };
const puzzle = makePuzzle(12, 'easy');
const solution = parseGrid(puzzle.solution);

/** An empty cell of the game, and its right and a wrong digit. */
function emptyCell(game: Game, nth = 0): { cell: number; right: number; wrong: number } {
  const cell = game.digits.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0)[nth]!;
  const right = solution[cell]!;
  return { cell, right, wrong: (right % 9) + 1 };
}

function solveAll(game: Game): Game {
  let g = game;
  for (let cell = 0; cell < 81; cell++) if (!g.digits[cell]) g = placeDigit(g, cell, solution[cell]!, ON);
  return g;
}

describe('a game', () => {
  it('starts with the open digits, which cannot be changed', () => {
    const game = newGame(puzzle);
    const given = game.digits.findIndex((d) => d > 0);
    expect(isGiven(game, given)).toBe(true);
    expect(placeDigit(game, given, (game.digits[given]! % 9) + 1, ON)).toBe(game);
    expect(clearCell(game, given)).toBe(game);
    expect(filledCount(game)).toBe(puzzle.givens.replaceAll('0', '').length);
  });

  it('places a digit, clears the cell notes and, if asked, the same note around it', () => {
    let game = newGame(puzzle);
    const { cell, right } = emptyCell(game);
    const peer = PEERS[cell]!.find((p) => !game.digits[p])!;
    game = toggleNote(game, peer, right);
    game = toggleNote(game, cell, right);
    expect(game.notes[peer]).toBe(bit(right));
    const auto = placeDigit(game, cell, right, ON);
    expect(auto.digits[cell]).toBe(right);
    expect(auto.notes[cell]).toBe(0);
    expect(auto.notes[peer]).toBe(0);
    const manual = placeDigit(game, cell, right, OFF);
    expect(manual.notes[peer]).toBe(bit(right));
  });

  it('notes only in empty cells; clearing takes the digit first, then the notes', () => {
    let game = newGame(puzzle);
    const { cell, right } = emptyCell(game);
    game = toggleNote(toggleNote(game, cell, 1), cell, 2);
    expect(game.notes[cell]).toBe(bit(1) | bit(2));
    game = toggleNote(game, cell, 1);
    expect(game.notes[cell]).toBe(bit(2));
    const placed = placeDigit(game, cell, right, OFF);
    expect(toggleNote(placed, cell, 3)).toBe(placed);
    expect(clearCell(placed, cell).digits[cell]).toBe(0);
    expect(clearCell(game, cell).notes[cell]).toBe(0);
  });

  it('fills notes with what is possible, keeping the player’s own choice', () => {
    let game = newGame(puzzle);
    const { cell } = emptyCell(game);
    const possible = candidatesOf(game.digits);
    game = toggleNote(game, cell, 1);
    game = toggleNote(game, cell, game.digits.find((d) => d > 0 && possible[cell]! & bit(d)) ?? 2);
    const kept = game.notes[cell]! & possible[cell]!;
    const filled = fillNotes(game);
    expect(filled.notes[cell]).toBe(kept);
    const other = emptyCell(game, 1).cell;
    expect(filled.notes[other]).toBe(possible[other]);
    expect(filled.undo).toHaveLength(game.undo.length + 1); // one move
  });

  it('undoes and redoes every change; a new change forgets what could be redone', () => {
    const start = newGame(puzzle);
    const a = emptyCell(start, 0);
    const b = emptyCell(start, 1);
    let game = placeDigit(start, a.cell, a.wrong, ON);
    game = placeDigit(game, b.cell, b.right, ON);
    game = undo(undo(game));
    expect(game.digits).toEqual(start.digits);
    game = redo(game);
    expect(game.digits[a.cell]).toBe(a.wrong);
    game = toggleNote(game, b.cell, 4);
    expect(game.redo).toHaveLength(0);
    expect(redo(game)).toBe(game);
  });

  it('knows wrong and repeated digits and how many of each digit are left', () => {
    let game = newGame(puzzle);
    const { cell, wrong } = emptyCell(game);
    game = placeDigit(game, cell, wrong, OFF);
    expect(wrongCells(game)).toEqual([cell]);
    const left = remaining(game);
    const placed = game.digits.filter((d) => d === wrong).length;
    expect(left[wrong - 1]).toBe(Math.max(0, 9 - placed));
    const peerWithSame = PEERS[cell]!.find((p) => game.digits[p] === wrong);
    if (peerWithSame !== undefined) expect(repeatedCells(game)).toContain(cell);
  });

  it('ends when every digit is right; then nothing changes any more', () => {
    let game = newGame(puzzle);
    const { cell, wrong } = emptyCell(game);
    game = placeDigit(game, cell, wrong, ON);
    game = solveAll(game); // fills every other cell; the wrong digit stays
    expect(isFull(game)).toBe(true);
    expect(game.solved).toBe(false); // full is not solved
    game = placeDigit(game, cell, solution[cell]!, ON);
    expect(game.solved).toBe(true);
    expect(isFull(game)).toBe(true);
    expect(placeDigit(game, cell, wrong, ON)).toBe(game);
    expect(undo(game)).toBe(game);
    expect(addTime(game, 1000)).toBe(game);
  });

  it('a hint is one move: notes it explained go, its digit is placed; hints are counted', () => {
    let game = fillNotes(newGame(puzzle));
    const { cell, right } = emptyCell(game);
    const other = emptyCell(game, 1).cell;
    const before = game.notes[other]!;
    const removed = before & -before; // its lowest note, as if a technique removed it
    game = askHint(game);
    game = applyHint(game, [{ cell: other, mask: removed }], cell, right, ON);
    expect(game.hints).toBe(1);
    expect(game.digits[cell]).toBe(right);
    expect(game.notes[other]).toBe(before & ~removed & ~(PEERS[cell]!.includes(other) ? bit(right) : 0));
    expect(undo(game).digits[cell]).toBe(0);
    expect(undo(game).notes[other]).toBe(before);
  });

  it('counts time until solved', () => {
    const game = addTime(addTime(newGame(puzzle), 1500), 500);
    expect(game.ms).toBe(2000);
  });
});

describe('daily puzzle and statistics', () => {
  it('gives everybody the same puzzle on the same day and level', () => {
    expect(dailySeed('2026-11-24', 'hard')).toBe(dailySeed('2026-11-24', 'hard'));
    expect(dailySeed('2026-11-24', 'hard')).not.toBe(dailySeed('2026-11-25', 'hard'));
    expect(dailySeed('2026-11-24', 'hard')).not.toBe(dailySeed('2026-11-24', 'expert'));
  });

  it('counts solved games, those without hints, and the best time without hints', () => {
    const won = addTime(solveAll(newGame(puzzle)), 0);
    const solved = { ...won, ms: 90_000 };
    let stats = recordSolved(emptyStats(), solved);
    expect(stats.easy).toEqual({ solved: 1, clean: 1, bestMs: 90_000 });
    stats = recordSolved(stats, { ...solved, ms: 60_000, hints: 2 });
    expect(stats.easy).toEqual({ solved: 2, clean: 1, bestMs: 90_000 }); // a time with hints is not a record
    stats = recordSolved(stats, { ...solved, ms: 80_000 });
    expect(stats.easy.bestMs).toBe(80_000);
    expect(recordSolved(stats, newGame(puzzle))).toBe(stats); // not solved
    expect(stats.hard.solved).toBe(0);
  });
});
