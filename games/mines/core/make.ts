// The maker of fields (docs/mines/SPEC.md, "Як грати", "Перше місце"): from a seed on, mines laid at random away from
// the first place, again and again, until a field the solver opens from the first place by the reasoning of its level
// alone — so no field ever asks the player to guess. The same seed and first place always give the same field; the
// field of the day comes from the date and the level. In slices. Pure.
import { seedFromText } from '../../../shared/core/rng.ts';
import { MINES, type Level, type LevelRule } from '../config.ts';
import { layMines, pickStart, type Field } from './field.ts';
import { solveField } from './solve.ts';
import type { Task } from './task.ts';

/**
 * A field of a level (or of a rule of its own: the player's size) from the seed; `start` — the first place the player
 * chose, null — the game picks it.
 */
export function makeField(level: Level | LevelRule, seed: number, start: number | null = null): Task<Field> {
  const rule = typeof level === 'string' ? MINES.levels[level] : level;
  let state = seed >>> 0;
  return {
    run(steps) {
      let left = steps;
      while (left > 0) {
        let first = start;
        if (first === null) {
          const picked = pickStart(rule, state);
          first = picked.start;
          state = picked.state;
        }
        const laid = layMines(rule, rule.mines, first, state);
        state = laid.state;
        const solved = solveField(laid.field, rule.logic);
        left -= Math.max(1, solved.work);
        if (solved.solved) return laid.field;
      }
      return undefined;
    },
  };
}

/** The seed of the field of the day: the same for everybody on that day, its own for each level. */
export const dailySeed = (dateKey: string, level: Level): number => seedFromText(`way1ong-mines:daily:${level}:${dateKey}`);
