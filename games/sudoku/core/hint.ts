// What the hint button shows. A wrong digit first (reasoning would not hold with it); otherwise the steps to the
// next digit: on harder levels some candidates are removed first, each removal by a technique, then the digit
// is placed. Only the steps the digit really needs are kept, so a hint never shows a detour.
import { CELLS, UNITS, UNITS_OF, bit, countOf } from './grid.ts';
import { applyStep, nextStep, positionOf } from './logic.ts';
import { stillHolds, type Position, type Step } from './techniques.ts';

export type Hint =
  /** Digits on the board that are not those of the solution. */
  | { kind: 'mistakes'; cells: number[] }
  /** Steps that remove candidates (maybe none), and last the step that places a digit. */
  | { kind: 'steps'; steps: Step[] }
  /** No technique finds the next digit (should not happen with our puzzles): the digit is simply shown. */
  | { kind: 'reveal'; cell: number; digit: number };

function copy(pos: Position): Position {
  return { values: [...pos.values], cands: [...pos.cands] };
}

/** Whether the cell may hold no other digit, or the digit no other cell of one of the cell's units. */
function placeable(pos: Position, cell: number, digit: number): boolean {
  const b = bit(digit);
  if (!(pos.cands[cell]! & b)) return false;
  if (countOf(pos.cands[cell]!) === 1) return true;
  return UNITS_OF[cell]!.some((u) => UNITS[u]!.cells.every((other) => other === cell || !(pos.cands[other]! & b)));
}

/** The step that places the digit, by the simplest technique that shows it. */
function placementStep(pos: Position, cell: number, digit: number): Step {
  const [row, col, box] = UNITS_OF[cell]!;
  const units = [box!, row!, col!];
  const b = bit(digit);
  const lastFree = units.find((u) => UNITS[u]!.cells.every((other) => other === cell || pos.values[other]));
  const only = units.find((u) => UNITS[u]!.cells.every((other) => other === cell || !(pos.cands[other]! & b)));
  const technique = lastFree !== undefined ? 'fullHouse' : only !== undefined ? 'hiddenSingle' : 'nakedSingle';
  const stepUnits = lastFree !== undefined ? [lastFree] : only !== undefined ? [only] : [row!, col!, box!];
  return { technique, place: { cell, digit }, eliminate: [], cells: [cell], units: stepUnits, digits: [digit] };
}

/** Replays the removals from the start; whether each still holds and the digit can then be placed. */
function leadsTo(start: Position, steps: readonly Step[], cell: number, digit: number): boolean {
  const pos = copy(start);
  for (const step of steps) {
    if (!stillHolds(pos, step)) return false;
    applyStep(pos, step);
  }
  return placeable(pos, cell, digit);
}

/** The hint for the board as it is now, or null when the board is already solved. */
export function nextHint(values: readonly number[], solution: readonly number[]): Hint | null {
  const mistakes = values.flatMap((digit, cell) => (digit && digit !== solution[cell] ? [cell] : []));
  if (mistakes.length) return { kind: 'mistakes', cells: mistakes };
  if (values.every((digit) => digit > 0)) return null;

  const start = positionOf(values);
  const pos = copy(start);
  const removals: Step[] = [];
  for (;;) {
    const step = nextStep(pos);
    if (!step) {
      // Not expected: show the digit of the cell with the fewest candidates.
      let cell = values.indexOf(0);
      for (let c = 0; c < CELLS; c++) if (!pos.values[c] && countOf(pos.cands[c]!) < countOf(pos.cands[cell]!)) cell = c;
      return { kind: 'reveal', cell, digit: solution[cell]! };
    }
    if (step.place) {
      if (!removals.length) return { kind: 'steps', steps: [step] };
      const { cell, digit } = step.place;
      // Keep only the removals the digit needs: drop each one whose absence still leads to the digit.
      let kept = removals;
      for (let i = 0; i < kept.length; ) {
        const without = kept.filter((_, j) => j !== i);
        if (leadsTo(start, without, cell, digit)) kept = without;
        else i++;
      }
      const end = copy(start);
      for (const s of kept) applyStep(end, s);
      return { kind: 'steps', steps: [...kept, placementStep(end, cell, digit)] };
    }
    removals.push(step);
    applyStep(pos, step);
  }
}
