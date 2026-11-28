// The ways to play (docs/slide/SPEC.md): the fifteen — a shuffle of each size from a seed, and the 4x4 of the day;
// "Clear the way" and "The chest" — levels in a row (the fewest moves grow stage by stage), free play by difficulty
// and the puzzle of the day, all taken from each mode's set made in advance (its stages and difficulties: `ways`,
// "Clear the way" when none is given); each puzzle's look of "Clear the way" (harbour, room, box) drawn from its seed
// (decision of 27.11: at random). Pure; randomness only from seeds.
import { nextInt, seedFromText } from '../../../shared/core/rng.ts';
import { SLIDE, THEMES, type Difficulty, type PoolWays, type Theme } from '../config.ts';
import { shuffle } from './fifteen.ts';
import { fewestMoves } from './fifteen-solve.ts';
import { byMoves, type PoolPuzzle } from './pool.ts';

/** A shuffle of the fifteen: never too near the end where the game can count it (config: leastMoves). */
export function fifteenTiles(size: number, seed: number): number[] {
  const least = SLIDE.fifteen.leastMoves[size] ?? 0;
  return shuffle(size, seed, least, least ? fewestMoves : undefined).tiles;
}

/** The seed of the day's puzzle of a mode: the same for everybody on that date ("YYYY-MM-DD"). */
export function dailySeed(mode: 'fifteen' | 'unblock' | 'box', date: string): number {
  return seedFromText(`way1ong-slide:${mode}:daily:${date}`);
}

/** One of `count` things (a picture, a look) from a seed. */
export function pick(seed: number, count: number): number {
  return nextInt(seed, count).value;
}

/** The look of a "Clear the way" puzzle played from this seed. */
export function themeOf(seed: number): Theme {
  return THEMES[pick(seedFromText(`way1ong-slide:theme:${seed}`), THEMES.length)]!;
}

/** The fewest moves of a level in a row. */
export function levelMoves(level: number, ways: PoolWays = SLIDE.unblock): number {
  const stages = ways.stages;
  let i = 0;
  while (i + 1 < stages.length && stages[i + 1]!.from <= level) i++;
  const stage = stages[i]!;
  const next = stages[i + 1];
  const [least, most] = stage.moves;
  if (next) {
    const length = next.from - stage.from;
    const place = length > 1 ? (level - stage.from) / (length - 1) : 1;
    return Math.round(least + (most - least) * place);
  }
  // the last stage has no end: its levels go round its range
  return least + ((level - stage.from) % (most - least + 1));
}

/** The seed of a level in a row (in "Clear the way", its look). */
export function levelSeed(level: number, mode: 'unblock' | 'box' = 'unblock'): number {
  return seedFromText(mode === 'unblock' ? `way1ong-slide:level:${level}` : `way1ong-slide:${mode}:level:${level}`);
}

const indexes = new WeakMap<readonly PoolPuzzle[], Map<number, PoolPuzzle[]>>();
const indexOf = (pool: readonly PoolPuzzle[]) => {
  let index = indexes.get(pool);
  if (!index) indexes.set(pool, (index = byMoves(pool)));
  return index;
};

/**
 * A level in a row: the next puzzle (in the order of the set) of its number of moves, so no two levels share one
 * while the set has enough; if the set has none of that number, the nearest fewer.
 */
export function levelPuzzle(pool: readonly PoolPuzzle[], level: number, ways: PoolWays = SLIDE.unblock): PoolPuzzle {
  const moves = levelMoves(level, ways);
  let earlier = 0;
  for (let l = 1; l < level; l++) if (levelMoves(l, ways) === moves) earlier++;
  const index = indexOf(pool);
  for (let m = moves; m > 0; m--) {
    const list = index.get(m);
    if (list?.length) return list[earlier % list.length]!;
  }
  throw new Error('The set of puzzles is empty');
}

/** The puzzles of a difficulty of free play. */
export function puzzlesOf(pool: readonly PoolPuzzle[], difficulty: Difficulty, ways: PoolWays = SLIDE.unblock): PoolPuzzle[] {
  const [least, most] = ways.difficulties[difficulty];
  return pool.filter((p) => p.moves >= least && p.moves <= (most ?? Infinity));
}

/** A puzzle of a difficulty from a seed (free play, the day). */
export function freePuzzle(pool: readonly PoolPuzzle[], difficulty: Difficulty, seed: number, ways: PoolWays = SLIDE.unblock): PoolPuzzle {
  const list = puzzlesOf(pool, difficulty, ways);
  if (!list.length) throw new Error(`No puzzle of difficulty ${difficulty}`);
  return list[pick(seed, list.length)]!;
}

/**
 * A mode's ways with its Hard no longer than `cap` moves ("The chest": a setting, decision of 28.11 «зроби опційно»):
 * the same puzzles, the longest left out.
 */
export function withHardCap(ways: PoolWays, cap: number): PoolWays {
  const [least, most] = ways.difficulties.hard;
  return { ...ways, difficulties: { ...ways.difficulties, hard: [least, most === null ? cap : Math.min(most, cap)] } };
}
