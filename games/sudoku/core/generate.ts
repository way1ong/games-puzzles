// Making a puzzle from a seed: a random full board, then digits removed (in pairs symmetric about the centre)
// for as long as the puzzle stays solvable by the level's techniques — which also means it has one solution.
// An attempt that misses the level (too many digits left, or nothing harder than the level before it was
// needed) is followed by the next one from the same random stream, so a seed always gives the same puzzle.
import { SUDOKU, type Level } from '../config.ts';
import { CELLS, formatGrid, type Grid } from './grid.ts';
import { solveLogically, techniquesOf } from './logic.ts';
import { makeRand, shuffled, type Rand } from './rand.ts';
import { randomFull } from './search.ts';

export interface Puzzle {
  level: Level;
  seed: number;
  /** The open digits, one character a cell, row by row; '0' — empty. */
  givens: string;
  /** The only solution, in the same form. */
  solution: string;
}

/** Cells removed together: a cell and its mirror through the centre (the centre alone), or single cells. */
function removalGroups(): number[][] {
  if (!SUDOKU.symmetric) return Array.from({ length: CELLS }, (_, cell) => [cell]);
  const groups: number[][] = [];
  for (let cell = 0; cell < CELLS / 2; cell++) {
    const mirror = CELLS - 1 - cell;
    groups.push(cell === mirror ? [cell] : [cell, mirror]);
  }
  return groups;
}

/**
 * One attempt, step by step: yields after every group of cells tried (so a screen can make a puzzle in small
 * slices), returns the puzzle or null when this attempt misses the level.
 */
function* attempt(rand: Rand, level: Level): Generator<void, { puzzle: Grid; solution: Grid } | null> {
  const rule = SUDOKU.levels[level];
  const allowed = techniquesOf(level);
  const full = randomFull(rand);
  const grid = [...full];
  let givens = CELLS;
  for (const group of shuffled(rand, removalGroups())) {
    if (rule.minGivens !== null && givens - group.length < rule.minGivens) continue;
    for (const cell of group) grid[cell] = 0;
    if (solveLogically(grid, allowed).solved) givens -= group.length;
    else for (const cell of group) grid[cell] = full[cell]!;
    yield;
  }
  if (rule.maxGivens !== null && givens > rule.maxGivens) return null;
  if (rule.needsNew) {
    const used = solveLogically(grid, allowed).used;
    if (!used.some((t) => rule.adds.some((added) => added === t))) return null;
  }
  return { puzzle: grid, solution: full };
}

export interface Making {
  /** Attempts made so far, the current one included. */
  attempts: number;
}

/**
 * The puzzle of a seed and level, made in small slices: every `next()` does a little work. The same seed and
 * level always give the same puzzle.
 */
export function* puzzleMaker(seed: number, level: Level): Generator<Making, Puzzle> {
  const rand = makeRand(seed);
  let last: { puzzle: Grid; solution: Grid } | null = null;
  for (let attempts = 1; attempts <= SUDOKU.maxAttempts; attempts++) {
    const steps = attempt(rand, level);
    for (let r = steps.next(); ; r = steps.next()) {
      if (r.done) {
        last = r.value;
        break;
      }
      yield { attempts };
    }
    if (last) break;
  }
  if (!last) throw new Error(`No ${level} puzzle from seed ${seed}`);
  return { level, seed, givens: formatGrid(last.puzzle), solution: formatGrid(last.solution) };
}

/** The puzzle of a seed and level, made at once (tests, and wherever waiting is fine). */
export function makePuzzle(seed: number, level: Level): Puzzle {
  const maker = puzzleMaker(seed, level);
  for (let r = maker.next(); ; r = maker.next()) if (r.done) return r.value;
}
