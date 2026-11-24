// Solving techniques a person uses. Each looks at a position (the digits placed and the candidates left) and
// returns the first step it finds that makes progress: a digit to place, or candidates to remove. A step names
// the cells, units and digits it rests on, so a hint can show and explain it. Every step is sound — it never
// removes the digit of the solution (tests check it on many puzzles).
import type { Technique } from '../config.ts';
import {
  ALL,
  CELLS,
  PEERS,
  SIZE,
  UNITS,
  UNITS_OF,
  bit,
  boxOf,
  boxUnit,
  colOf,
  colUnit,
  countOf,
  digitsOf,
  onlyDigit,
  rowOf,
  rowUnit,
  sees,
  type Grid,
} from './grid.ts';

export interface Position {
  /** Digits placed (0 — empty). */
  values: Grid;
  /** Candidates of every empty cell; 0 for a filled cell. */
  cands: number[];
}

export interface Elimination {
  cell: number;
  /** The digits removed from the cell's candidates. */
  mask: number;
}

export interface Step {
  technique: Technique;
  /** The digit the step places, or null for a step that only removes candidates. */
  place: { cell: number; digit: number } | null;
  /** Candidates the step removes. */
  eliminate: Elimination[];
  /**
   * The cells the step rests on: for a single — the cell the digit goes to; for a wing — the pivot first,
   * then the two pincers.
   */
  cells: number[];
  /** The units the step looks at (indices in UNITS); for a fish — the base lines first, then the cover lines. */
  units: number[];
  /** The digits of the pattern: from the smallest; for a wing — x, y and last the digit removed (z). */
  digits: number[];
}

type Finder = (pos: Position) => Step | null;

/** Boxes first — the easiest place for a person to spot a digit — then rows, then columns. */
const SEARCH_ORDER: readonly number[] = [
  ...Array.from({ length: SIZE }, (_, b) => boxUnit(b)),
  ...Array.from({ length: SIZE }, (_, r) => rowUnit(r)),
  ...Array.from({ length: SIZE }, (_, c) => colUnit(c)),
];
const LINES: readonly number[] = SEARCH_ORDER.slice(SIZE);

function placedIn(pos: Position, unit: number): number {
  let mask = 0;
  for (const cell of UNITS[unit]!.cells) if (pos.values[cell]) mask |= bit(pos.values[cell]);
  return mask;
}

/** Cells of the unit that may still hold the digit. */
function placesOf(pos: Position, unit: number, digit: number): number[] {
  const b = bit(digit);
  return UNITS[unit]!.cells.filter((cell) => pos.cands[cell]! & b);
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const pick = (from: number, chosen: T[]): void => {
    if (chosen.length === k) {
      out.push([...chosen]);
      return;
    }
    for (let i = from; i <= items.length - (k - chosen.length); i++) {
      chosen.push(items[i]!);
      pick(i + 1, chosen);
      chosen.pop();
    }
  };
  pick(0, []);
  return out;
}

const placement = (technique: Technique, cell: number, digit: number, units: number[]): Step => ({
  technique,
  place: { cell, digit },
  eliminate: [],
  cells: [cell],
  units,
  digits: [digit],
});

/** The last empty cell of a unit takes the digit the unit lacks. */
const fullHouse: Finder = (pos) => {
  for (const u of SEARCH_ORDER) {
    const empty = UNITS[u]!.cells.filter((cell) => !pos.values[cell]);
    if (empty.length !== 1) continue;
    const missing = ALL & ~placedIn(pos, u);
    if (countOf(missing) === 1 && pos.cands[empty[0]!]! & missing) return placement('fullHouse', empty[0]!, onlyDigit(missing), [u]);
  }
  return null;
};

/** A digit has one place left in a unit. */
const hiddenSingle: Finder = (pos) => {
  for (const u of SEARCH_ORDER) {
    const placed = placedIn(pos, u);
    for (let d = 1; d <= SIZE; d++) {
      if (placed & bit(d)) continue;
      const places = placesOf(pos, u, d);
      if (places.length === 1) return placement('hiddenSingle', places[0]!, d, [u]);
    }
  }
  return null;
};

/** A cell has one candidate left. */
const nakedSingle: Finder = (pos) => {
  for (let cell = 0; cell < CELLS; cell++) {
    if (!pos.values[cell] && countOf(pos.cands[cell]!) === 1) {
      return placement('nakedSingle', cell, onlyDigit(pos.cands[cell]!), [...UNITS_OF[cell]!]);
    }
  }
  return null;
};

/** Removes the digit from the cells (outside `keep`) that still hold it. */
function removeDigit(pos: Position, digit: number, cells: readonly number[], keep: readonly number[]): Elimination[] {
  const b = bit(digit);
  return cells.filter((cell) => pos.cands[cell]! & b && !keep.includes(cell)).map((cell) => ({ cell, mask: b }));
}

/** In a box a digit fits only in one row (column): elsewhere in that row (column) it cannot be. */
const pointing: Finder = (pos) => {
  for (let box = 0; box < SIZE; box++) {
    const u = boxUnit(box);
    const placed = placedIn(pos, u);
    for (let d = 1; d <= SIZE; d++) {
      if (placed & bit(d)) continue;
      const places = placesOf(pos, u, d);
      if (places.length < 2) continue;
      for (const [lineOf, unitOf] of [
        [rowOf, rowUnit],
        [colOf, colUnit],
      ] as const) {
        const line = lineOf(places[0]!);
        if (!places.every((cell) => lineOf(cell) === line)) continue;
        const eliminate = removeDigit(pos, d, UNITS[unitOf(line)]!.cells, places);
        if (eliminate.length) return { technique: 'pointing', place: null, eliminate, cells: places, units: [u, unitOf(line)], digits: [d] };
      }
    }
  }
  return null;
};

/** In a row (column) a digit fits only inside one box: elsewhere in that box it cannot be. */
const claiming: Finder = (pos) => {
  for (const u of LINES) {
    const placed = placedIn(pos, u);
    for (let d = 1; d <= SIZE; d++) {
      if (placed & bit(d)) continue;
      const places = placesOf(pos, u, d);
      if (places.length < 2) continue;
      const box = boxOf(places[0]!);
      if (!places.every((cell) => boxOf(cell) === box)) continue;
      const eliminate = removeDigit(pos, d, UNITS[boxUnit(box)]!.cells, places);
      if (eliminate.length) return { technique: 'claiming', place: null, eliminate, cells: places, units: [u, boxUnit(box)], digits: [d] };
    }
  }
  return null;
};

/** k cells of a unit hold only the same k digits: the other cells of the unit cannot hold them. */
function nakedSubset(k: number, technique: Technique): Finder {
  return (pos) => {
    for (const u of SEARCH_ORDER) {
      const cells = UNITS[u]!.cells;
      const open = cells.filter((cell) => !pos.values[cell] && countOf(pos.cands[cell]!) >= 2 && countOf(pos.cands[cell]!) <= k);
      for (const group of combinations(open, k)) {
        const digits = group.reduce((mask, cell) => mask | pos.cands[cell]!, 0);
        if (countOf(digits) !== k) continue;
        const eliminate = cells
          .filter((cell) => !group.includes(cell) && pos.cands[cell]! & digits)
          .map((cell) => ({ cell, mask: pos.cands[cell]! & digits }));
        if (eliminate.length) return { technique, place: null, eliminate, cells: group, units: [u], digits: digitsOf(digits) };
      }
    }
    return null;
  };
}

/** k digits fit in a unit only into the same k cells: those cells cannot hold any other digit. */
function hiddenSubset(k: number, technique: Technique): Finder {
  return (pos) => {
    for (const u of SEARCH_ORDER) {
      const placed = placedIn(pos, u);
      const options: { digit: number; places: number[] }[] = [];
      for (let d = 1; d <= SIZE; d++) {
        if (placed & bit(d)) continue;
        const places = placesOf(pos, u, d);
        if (places.length >= 2 && places.length <= k) options.push({ digit: d, places });
      }
      for (const group of combinations(options, k)) {
        const cells = [...new Set(group.flatMap((o) => o.places))].sort((a, b) => a - b);
        if (cells.length !== k) continue;
        const keep = group.reduce((mask, o) => mask | bit(o.digit), 0);
        const eliminate = cells
          .filter((cell) => pos.cands[cell]! & ~keep)
          .map((cell) => ({ cell, mask: pos.cands[cell]! & ~keep }));
        if (eliminate.length) return { technique, place: null, eliminate, cells, units: [u], digits: digitsOf(keep) };
      }
    }
    return null;
  };
}

/**
 * Fish of size n (2 — X-Wing, 3 — Swordfish): in n rows a digit fits only within the same n columns, so in
 * those columns it is in these rows — and nowhere else in the columns. The same with rows and columns swapped.
 */
function fish(n: number, technique: Technique): Finder {
  return (pos) => {
    for (let d = 1; d <= SIZE; d++) {
      const b = bit(d);
      for (const byRows of [true, false]) {
        const base: { line: number; cross: number[] }[] = [];
        for (let line = 0; line < SIZE; line++) {
          const u = byRows ? rowUnit(line) : colUnit(line);
          const places = placesOf(pos, u, d);
          if (places.length >= 2 && places.length <= n) base.push({ line, cross: places.map(byRows ? colOf : rowOf) });
        }
        for (const group of combinations(base, n)) {
          const cross = [...new Set(group.flatMap((g) => g.cross))].sort((a, c) => a - c);
          if (cross.length !== n) continue;
          const lines = group.map((g) => g.line);
          const eliminate: Elimination[] = [];
          for (const x of cross) {
            for (const cell of UNITS[byRows ? colUnit(x) : rowUnit(x)]!.cells) {
              const line = byRows ? rowOf(cell) : colOf(cell);
              if (!lines.includes(line) && pos.cands[cell]! & b) eliminate.push({ cell, mask: b });
            }
          }
          if (!eliminate.length) continue;
          const cells = lines.flatMap((line) => placesOf(pos, byRows ? rowUnit(line) : colUnit(line), d));
          const units = [
            ...lines.map((line) => (byRows ? rowUnit(line) : colUnit(line))),
            ...cross.map((x) => (byRows ? colUnit(x) : rowUnit(x))),
          ];
          return { technique, place: null, eliminate, cells, units, digits: [d] };
        }
      }
    }
    return null;
  };
}

/** Cells (other than `except`) that see every one of `cells` and still hold the digit. */
function seeingAll(pos: Position, cells: readonly number[], digit: number): Elimination[] {
  const b = bit(digit);
  return PEERS[cells[0]!]!.filter((cell) => !cells.includes(cell) && pos.cands[cell]! & b && cells.every((c) => sees(c, cell))).map(
    (cell) => ({ cell, mask: b }),
  );
}

/**
 * XY-Wing: a pivot with two candidates x and y sees two cells with x and z and with y and z. Whichever digit
 * the pivot takes, one of those two cells is z — so a cell that sees both cannot be z.
 */
const xyWing: Finder = (pos) => {
  const pairs = Array.from({ length: CELLS }, (_, cell) => cell).filter((cell) => countOf(pos.cands[cell]!) === 2);
  for (const pivot of pairs) {
    const p = pos.cands[pivot]!;
    const wings = pairs.filter((cell) => sees(pivot, cell) && countOf(pos.cands[cell]! & p) === 1);
    for (const [a, c] of combinations(wings, 2)) {
      const ma = pos.cands[a!]!;
      const mc = pos.cands[c!]!;
      if ((ma & p) === (mc & p)) continue; // both wings share the same digit with the pivot
      const z = ma & mc & ~p;
      if (countOf(z) !== 1 || (ma & mc) !== z) continue;
      const digitZ = onlyDigit(z);
      const eliminate = seeingAll(pos, [a!, c!], digitZ).filter((e) => e.cell !== pivot);
      if (eliminate.length) {
        return {
          technique: 'xyWing',
          place: null,
          eliminate,
          cells: [pivot, a!, c!],
          units: [],
          digits: [onlyDigit(ma & p), onlyDigit(mc & p), digitZ],
        };
      }
    }
  }
  return null;
};

/**
 * XYZ-Wing: a pivot with x, y and z sees two cells with x and z and with y and z. Whatever happens, z is in one
 * of the three — so a cell that sees all three cannot be z.
 */
const xyzWing: Finder = (pos) => {
  for (let pivot = 0; pivot < CELLS; pivot++) {
    const p = pos.cands[pivot]!;
    if (countOf(p) !== 3) continue;
    const wings = PEERS[pivot]!.filter((cell) => countOf(pos.cands[cell]!) === 2 && (pos.cands[cell]! & ~p) === 0);
    for (const [a, c] of combinations(wings, 2)) {
      const ma = pos.cands[a!]!;
      const mc = pos.cands[c!]!;
      const z = ma & mc;
      if (ma === mc || countOf(z) !== 1) continue;
      const digitZ = onlyDigit(z);
      const eliminate = seeingAll(pos, [pivot, a!, c!], digitZ);
      if (eliminate.length) {
        return {
          technique: 'xyzWing',
          place: null,
          eliminate,
          cells: [pivot, a!, c!],
          units: [],
          digits: [onlyDigit(ma & ~z), onlyDigit(mc & ~z), digitZ],
        };
      }
    }
  }
  return null;
};

const cellsOf = (unit: number): readonly number[] => UNITS[unit]!.cells;
const within = (cells: readonly number[], allowed: readonly number[]): boolean => cells.every((c) => allowed.includes(c));

/**
 * Whether the pattern a removal step rests on still holds in this position — so a hint can check that the
 * steps it keeps still follow one another. Steps that place a digit are not removals: false.
 */
export function stillHolds(pos: Position, step: Step): boolean {
  const [d] = step.digits;
  const mask = step.digits.reduce((m, digit) => m | bit(digit), 0);
  switch (step.technique) {
    case 'pointing':
    case 'claiming':
      return within(placesOf(pos, step.units[0]!, d!), cellsOf(step.units[1]!));
    case 'nakedPair':
    case 'nakedTriple':
      return step.cells.every((cell) => !pos.values[cell] && (pos.cands[cell]! & ~mask) === 0);
    case 'hiddenPair':
    case 'hiddenTriple':
      return step.digits.every((digit) => within(placesOf(pos, step.units[0]!, digit), step.cells));
    case 'xWing':
    case 'swordfish': {
      const n = step.units.length / 2;
      const cover = step.units.slice(n).flatMap((u) => cellsOf(u));
      return step.units.slice(0, n).every((u) => within(placesOf(pos, u, d!), cover));
    }
    case 'xyWing': {
      const [x, y, z] = step.digits;
      const [pivot, a, c] = step.cells;
      return pos.cands[pivot!] === (bit(x!) | bit(y!)) && pos.cands[a!] === (bit(x!) | bit(z!)) && pos.cands[c!] === (bit(y!) | bit(z!));
    }
    case 'xyzWing': {
      const [x, y, z] = step.digits;
      const [pivot, a, c] = step.cells;
      return pos.cands[pivot!] === mask && pos.cands[a!] === (bit(x!) | bit(z!)) && pos.cands[c!] === (bit(y!) | bit(z!));
    }
    default:
      return false; // singles place digits; they are never among the removals
  }
}

export const FINDERS: Readonly<Record<Technique, Finder>> = {
  fullHouse,
  hiddenSingle,
  nakedSingle,
  pointing,
  claiming,
  // The size is part of each technique's definition: a pair is two cells, a triple three; an X-Wing is a fish
  // on two lines, a Swordfish on three.
  nakedPair: nakedSubset(2, 'nakedPair'),
  hiddenPair: hiddenSubset(2, 'hiddenPair'),
  nakedTriple: nakedSubset(3, 'nakedTriple'),
  hiddenTriple: hiddenSubset(3, 'hiddenTriple'),
  xWing: fish(2, 'xWing'),
  xyWing,
  swordfish: fish(3, 'swordfish'),
  xyzWing,
};
