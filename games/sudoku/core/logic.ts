// Solving the way a person does: each time the simplest technique that helps (TECHNIQUES order), until the
// board is full or no allowed technique helps. This grades the puzzles and finds the steps a hint explains.
import { LEVELS, SUDOKU, TECHNIQUES, type Level, type Technique } from '../config.ts';
import { PEERS, bit, candidatesOf, type Grid } from './grid.ts';
import { FINDERS, type Position, type Step } from './techniques.ts';

export function positionOf(values: readonly number[]): Position {
  return { values: [...values], cands: candidatesOf(values) };
}

/** Applies the step to the position in place. */
export function applyStep(pos: Position, step: Step): void {
  if (step.place) {
    const { cell, digit } = step.place;
    pos.values[cell] = digit;
    pos.cands[cell] = 0;
    for (const peer of PEERS[cell]!) pos.cands[peer]! &= ~bit(digit);
  }
  for (const e of step.eliminate) pos.cands[e.cell]! &= ~e.mask;
}

/** The allowed techniques in the order of TECHNIQUES (simplest first). */
function ordered(allowed: readonly Technique[]): Technique[] {
  return TECHNIQUES.filter((t) => allowed.includes(t));
}

/** The next step by the allowed techniques, the simplest first; null — none of them helps. */
export function nextStep(pos: Position, allowed: readonly Technique[] = TECHNIQUES): Step | null {
  for (const technique of ordered(allowed)) {
    const step = FINDERS[technique](pos);
    if (step) return step;
  }
  return null;
}

export interface LogicSolve {
  solved: boolean;
  steps: Step[];
  /** The techniques used, each once, in the order of TECHNIQUES. */
  used: Technique[];
  values: Grid;
}

export function solveLogically(values: readonly number[], allowed: readonly Technique[] = TECHNIQUES): LogicSolve {
  const techniques = ordered(allowed);
  const pos = positionOf(values);
  const steps: Step[] = [];
  const used = new Set<Technique>();
  for (;;) {
    if (pos.values.every((d) => d > 0)) break;
    const step = nextStep(pos, techniques);
    if (!step) break;
    steps.push(step);
    used.add(step.technique);
    applyStep(pos, step);
  }
  return {
    solved: pos.values.every((d) => d > 0),
    steps,
    used: TECHNIQUES.filter((t) => used.has(t)),
    values: pos.values,
  };
}

/** Every technique a level may use: its own and those of the levels before it. */
export function techniquesOf(level: Level): Technique[] {
  const upTo = LEVELS.slice(0, LEVELS.indexOf(level) + 1);
  return ordered(upTo.flatMap((l) => SUDOKU.levels[l].adds));
}

/** Whether a puzzle (0 — empty) belongs to the level (docs/sudoku/SPEC.md, "Рівні"). */
export function fitsLevel(puzzle: readonly number[], level: Level): boolean {
  const rule = SUDOKU.levels[level];
  const givens = puzzle.filter((d) => d > 0).length;
  if (rule.minGivens !== null && givens < rule.minGivens) return false;
  if (rule.maxGivens !== null && givens > rule.maxGivens) return false;
  const result = solveLogically(puzzle, techniquesOf(level));
  if (!result.solved) return false;
  return !rule.needsNew || result.used.some((t) => (rule.adds as readonly Technique[]).includes(t));
}
