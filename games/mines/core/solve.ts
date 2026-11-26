// What can be known for certain from the open numbers, without guessing (docs/mines/SPEC.md, "Рівні"). Three kinds of
// reasoning, simplest first (config LOGICS):
//   single — one number and its closed neighbours: all its mines are known, so the rest are safe; or it has as many
//            closed neighbours as mines left, so they are all mines;
//   pair   — two numbers that share closed neighbours: how many of their mines can lie in the shared cells decides the
//            cells only one of them touches;
//   all    — all the numbers along the edge of the open part together, and the number of mines left: every way the
//            mines could lie is weighed; a cell that is safe (or a mine) in every one of them is safe (or a mine).
// The maker of fields keeps only fields this reasoning solves from the first place; the hint shows its simplest step.
// Pure, no DOM.
import { LOGICS, MINES, type Logic } from '../config.ts';
import { cellCount, mineMap, neighbourTable, numbers, type Field, type Size } from './field.ts';

/** What is known of a cell: CLOSED — nothing; MINE — a mine for certain; 0…8 — open, its number. */
export const CLOSED = -1;
export const MINE = -2;

export interface Knowledge extends Size {
  /** All the mines of the field. */
  mines: number;
  cells: Int8Array;
}

export interface Deduction {
  logic: Logic;
  /** Cells that are safe for certain. */
  safe: number[];
  /** Cells with a mine for certain. */
  mines: number[];
  /** The open numbers the reasoning rests on (empty: only the number of mines left). */
  from: number[];
  /** The number of mines left was needed. */
  count: boolean;
}

export const logicRank = (logic: Logic): number => LOGICS.indexOf(logic);

/** A number's closed neighbours and how many mines are still to find among them; null — not open or nothing closed. */
function around(k: Knowledge, table: readonly Int16Array[], cell: number): { closed: number[]; need: number } | null {
  const n = k.cells[cell]!;
  if (n < 0) return null;
  let known = 0;
  const closed: number[] = [];
  for (const other of table[cell]!) {
    const v = k.cells[other]!;
    if (v === MINE) known++;
    else if (v === CLOSED) closed.push(other);
  }
  return closed.length > 0 ? { closed, need: n - known } : null;
}

/** One number alone. */
export function singleAt(k: Knowledge, cell: number): Deduction | null {
  const a = around(k, neighbourTable(k), cell);
  if (!a) return null;
  if (a.need === 0) return { logic: 'single', safe: a.closed, mines: [], from: [cell], count: false };
  if (a.need === a.closed.length) return { logic: 'single', safe: [], mines: a.closed, from: [cell], count: false };
  return null;
}

/** Two numbers that share closed neighbours. */
export function pairAt(k: Knowledge, a: number, b: number): Deduction | null {
  const table = neighbourTable(k);
  const p = around(k, table, a);
  const q = around(k, table, b);
  if (!p || !q) return null;
  const inQ = new Set(q.closed);
  const shared = p.closed.filter((c) => inQ.has(c));
  if (shared.length === 0) return null;
  const inP = new Set(p.closed);
  const onlyP = p.closed.filter((c) => !inQ.has(c));
  const onlyQ = q.closed.filter((c) => !inP.has(c));
  // how many mines may lie in the shared cells
  const least = Math.max(0, p.need - onlyP.length, q.need - onlyQ.length);
  const most = Math.min(p.need, q.need, shared.length);
  if (least > most) return null; // the open numbers disagree (a wrong flag): nothing is certain
  const safe: number[] = [];
  const mines: number[] = [];
  const side = (cells: number[], need: number) => {
    if (cells.length === 0) return;
    if (need - least === 0) safe.push(...cells);
    else if (need - most === cells.length) mines.push(...cells);
  };
  side(onlyP, p.need);
  side(onlyQ, q.need);
  if (most === 0) safe.push(...shared);
  else if (least === shared.length) mines.push(...shared);
  return safe.length || mines.length ? { logic: 'pair', safe, mines, from: [a, b], count: false } : null;
}

/** The open numbers within two cells of `cell` (they may share neighbours with it), after it in reading order. */
function partners(k: Knowledge, cell: number): number[] {
  const out: number[] = [];
  const row = Math.floor(cell / k.width);
  const column = cell % k.width;
  for (let r = row; r <= Math.min(k.height - 1, row + 2); r++) {
    for (let c = Math.max(0, column - 2); c <= Math.min(k.width - 1, column + 2); c++) {
      const other = r * k.width + c;
      if (other > cell && k.cells[other]! >= 0) out.push(other);
    }
  }
  return out;
}

// ---------- all the numbers together ----------

interface Group {
  /** The closed cells of the group. */
  cells: number[];
  /** The open numbers whose closed neighbours are in the group. */
  numbers: number[];
  /** For each count of mines in the group: possible. Null — too big to weigh: any count. */
  possible: boolean[] | null;
  /** [count][cell index]: some way with this count puts a mine there / leaves it safe. */
  mineSome: Uint8Array[];
  safeSome: Uint8Array[];
}

/** Every way the mines could lie in a group, weighed by the count of mines; null when over the limits. */
function weigh(k: Knowledge, table: readonly Int16Array[], cells: number[], numberCells: number[], budget: { steps: number }): Pick<Group, 'possible' | 'mineSome' | 'safeSome'> {
  const m = cells.length;
  const index = new Map(cells.map((c, i) => [c, i]));
  // constraints: for each number, the group's cells it touches and the mines still to find
  const cons = numberCells.map((cell) => {
    const a = around(k, table, cell)!;
    return { cells: a.closed.map((c) => index.get(c)!), need: a.need };
  });
  const consOf: number[][] = Array.from({ length: m }, () => []);
  cons.forEach((c, ci) => c.cells.forEach((i) => consOf[i]!.push(ci)));
  // cells in an order that meets the constraints early: breadth first along them
  const order: number[] = [];
  const placed = new Uint8Array(m);
  for (let s = 0; s < m; s++) {
    if (placed[s]) continue;
    const queue = [s];
    placed[s] = 1;
    while (queue.length) {
      const i = queue.shift()!;
      order.push(i);
      for (const ci of consOf[i]!) {
        for (const j of cons[ci]!.cells) {
          if (!placed[j]) {
            placed[j] = 1;
            queue.push(j);
          }
        }
      }
    }
  }
  const mines = new Int16Array(cons.length);
  const open = Int16Array.from(cons.map((c) => c.cells.length));
  const value = new Int8Array(m).fill(-1);
  const possible = new Array<boolean>(m + 1).fill(false);
  const mineSome = Array.from({ length: m + 1 }, () => new Uint8Array(m));
  const safeSome = Array.from({ length: m + 1 }, () => new Uint8Array(m));
  let total = 0;
  let over = false;

  const fits = (i: number, v: number): boolean => {
    for (const ci of consOf[i]!) {
      const c = cons[ci]!;
      const left = open[ci]! - 1;
      const got = mines[ci]! + v;
      if (got > c.need || got + left < c.need) return false;
    }
    return true;
  };
  const set = (i: number, v: number, sign: 1 | -1) => {
    for (const ci of consOf[i]!) {
      open[ci]! -= sign;
      mines[ci]! += sign * v;
    }
  };
  const visit = (depth: number): void => {
    if (over) return;
    if (--budget.steps < 0) {
      over = true;
      return;
    }
    if (depth === m) {
      possible[total] = true;
      const ms = mineSome[total]!;
      const ss = safeSome[total]!;
      for (let i = 0; i < m; i++) {
        if (value[i] === 1) ms[i] = 1;
        else ss[i] = 1;
      }
      return;
    }
    const i = order[depth]!;
    for (const v of [0, 1]) {
      if (!fits(i, v)) continue;
      value[i] = v;
      total += v;
      set(i, v, 1);
      visit(depth + 1);
      set(i, v, -1);
      total -= v;
      value[i] = -1;
    }
  };
  visit(0);
  if (over) return { possible: null, mineSome: [], safeSome: [] };
  return { possible, mineSome, safeSome };
}

/** Sums reachable by picking one possible count from each group (as a set of flags up to `cap`). */
function sums(groups: readonly Pick<Group, 'cells' | 'possible'>[], cap: number): Uint8Array {
  let reach = new Uint8Array(cap + 1);
  reach[0] = 1;
  for (const g of groups) {
    const next = new Uint8Array(cap + 1);
    for (let s = 0; s <= cap; s++) {
      if (!reach[s]) continue;
      for (let c = 0; c <= g.cells.length && s + c <= cap; c++) if (g.possible === null || g.possible[c]) next[s + c] = 1;
    }
    reach = next;
  }
  return reach;
}

/**
 * All the numbers together, with the number of mines left (`withCount`). Groups of closed cells along the edge are
 * weighed apart; the count of mines links them and the closed cells away from the numbers. The deductions come group
 * by group in reading order (the cells away from the numbers last); null — the open numbers disagree.
 */
export function allReasoning(k: Knowledge, withCount = true, meter: { used: number } = { used: 0 }): Deduction[] | null {
  const table = neighbourTable(k);
  const n = cellCount(k);
  // the edge: closed cells next to an open number; group them by the numbers they share
  const parent = new Int32Array(n).map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const edge = new Uint8Array(n);
  const numberCells: number[] = [];
  for (let cell = 0; cell < n; cell++) {
    const a = around(k, table, cell);
    if (!a) continue;
    if (a.need < 0 || a.need > a.closed.length) return null;
    numberCells.push(cell);
    for (const c of a.closed) {
      edge[c] = 1;
      parent[find(c)] = find(a.closed[0]!);
    }
  }
  const byRoot = new Map<number, Group>();
  for (let cell = 0; cell < n; cell++) {
    if (!edge[cell]) continue;
    const root = find(cell);
    let g = byRoot.get(root);
    if (!g) {
      g = { cells: [], numbers: [], possible: null, mineSome: [], safeSome: [] };
      byRoot.set(root, g);
    }
    g.cells.push(cell);
  }
  for (const cell of numberCells) {
    const a = around(k, table, cell)!;
    byRoot.get(find(a.closed[0]!))!.numbers.push(cell);
  }
  const groups = [...byRoot.values()];
  for (const g of groups) {
    if (g.cells.length > MINES.solve.groupCells) continue;
    const budget = { steps: MINES.solve.groupSteps };
    const w = weigh(k, table, g.cells, g.numbers, budget);
    meter.used += MINES.solve.groupSteps - Math.max(0, budget.steps);
    Object.assign(g, w);
    if (g.possible && !g.possible.some(Boolean)) return null;
  }
  let known = 0;
  let away = 0;
  for (let cell = 0; cell < n; cell++) {
    if (k.cells[cell] === MINE) known++;
    else if (k.cells[cell] === CLOSED && !edge[cell]) away++;
  }
  const left = k.mines - known;
  if (left < 0) return null;

  // which counts of each group fit the mines left (the rest lie away from the numbers)
  const fitting = groups.map((g, gi) => {
    const counts: number[] = [];
    if (g.possible === null) return counts;
    if (!withCount) {
      g.possible.forEach((p, c) => p && counts.push(c));
      return counts;
    }
    const others = sums(
      groups.filter((_, j) => j !== gi),
      left,
    );
    g.possible.forEach((p, c) => {
      if (!p) return;
      for (let s = 0; s + c <= left; s++) if (others[s] && left - c - s <= away) return void counts.push(c);
    });
    return counts;
  });
  if (withCount && fitting.some((counts, gi) => groups[gi]!.possible !== null && counts.length === 0)) return null;

  const out: Deduction[] = [];
  groups.forEach((g, gi) => {
    if (g.possible === null) return;
    const safe: number[] = [];
    const mines: number[] = [];
    g.cells.forEach((cell, i) => {
      const counts = fitting[gi]!;
      if (counts.every((c) => !g.mineSome[c]![i])) safe.push(cell);
      else if (counts.every((c) => !g.safeSome[c]![i])) mines.push(cell);
    });
    if (safe.length || mines.length) out.push({ logic: 'all', safe, mines, from: g.numbers, count: withCount });
  });
  if (withCount && away > 0) {
    // the cells away from the numbers hold whatever the groups leave
    const total = sums(groups, left);
    const leftAway: number[] = [];
    for (let s = 0; s <= left; s++) if (total[s] && left - s <= away) leftAway.push(left - s);
    const awayCells: number[] = [];
    for (let cell = 0; cell < n; cell++) if (k.cells[cell] === CLOSED && !edge[cell]) awayCells.push(cell);
    if (leftAway.length > 0 && leftAway.every((x) => x === 0)) out.push({ logic: 'all', safe: awayCells, mines: [], from: [], count: true });
    else if (leftAway.length > 0 && leftAway.every((x) => x === away)) out.push({ logic: 'all', safe: [], mines: awayCells, from: [], count: true });
  }
  return out;
}

/** Marks which deductions needed the number of mines left: those the reasoning without it does not reach. */
function withoutCount(k: Knowledge, found: Deduction[]): Deduction[] {
  const plain = allReasoning(k, false) ?? [];
  const known = new Set<number>();
  for (const d of plain) for (const c of [...d.safe, ...d.mines]) known.add(c);
  return found.map((d) => ({ ...d, count: d.from.length === 0 || [...d.safe, ...d.mines].some((c) => !known.has(c)) }));
}

/** The simplest step there is, up to `upTo`: the first in reading order of the simplest kind; null — none. */
export function nextStep(k: Knowledge, upTo: Logic = 'all'): Deduction | null {
  const n = cellCount(k);
  for (let cell = 0; cell < n; cell++) {
    const d = singleAt(k, cell);
    if (d) return d;
  }
  if (logicRank(upTo) < logicRank('pair')) return null;
  for (let cell = 0; cell < n; cell++) {
    if (k.cells[cell]! < 0) continue;
    for (const other of partners(k, cell)) {
      const d = pairAt(k, cell, other);
      if (d) return d;
    }
  }
  if (logicRank(upTo) < logicRank('all')) return null;
  const all = allReasoning(k, true);
  if (!all || all.length === 0) return null;
  return withoutCount(k, [all[0]!])[0]!;
}

// ---------- solving a whole field (the maker of fields) ----------

export interface Solved {
  solved: boolean;
  /** Work done: cells looked at and ways weighed (the maker's slices count it). */
  work: number;
}

/** Whether reasoning up to `logic` opens every cell without a mine, from the first place on. */
export function solveField(field: Field, logic: Logic): Solved {
  const table = neighbourTable(field);
  const nums = numbers(field);
  const mine = mineMap(field);
  const n = cellCount(field);
  const k: Knowledge = { width: field.width, height: field.height, mines: field.mines.length, cells: new Int8Array(n).fill(CLOSED) };
  let toOpen = n - field.mines.length;
  let work = 0;
  const queue: number[] = [];
  const queued = new Uint8Array(n);
  const recheck = (cell: number) => {
    for (const other of table[cell]!) {
      if (k.cells[other]! >= 0 && !queued[other]) {
        queued[other] = 1;
        queue.push(other);
      }
    }
  };
  const open = (cell: number) => {
    if (k.cells[cell] !== CLOSED) return;
    if (mine[cell]) throw new Error(`the solver opened a mine at ${cell}`);
    const stack = [cell];
    k.cells[cell] = nums[cell]!;
    while (stack.length) {
      const c = stack.pop()!;
      toOpen--;
      work++;
      if (!queued[c]) {
        queued[c] = 1;
        queue.push(c);
      }
      recheck(c);
      if (nums[c] !== 0) continue;
      for (const other of table[c]!) {
        if (k.cells[other] === CLOSED) {
          k.cells[other] = nums[other]!;
          stack.push(other);
        }
      }
    }
  };
  const flag = (cell: number) => {
    if (k.cells[cell] !== CLOSED) return;
    if (!mine[cell]) throw new Error(`the solver marked a safe cell at ${cell} as a mine`);
    k.cells[cell] = MINE;
    recheck(cell);
  };
  const apply = (d: Deduction) => {
    for (const c of d.safe) open(c);
    for (const c of d.mines) flag(c);
  };

  open(field.start);
  for (;;) {
    // one number at a time, as long as anything changes
    while (queue.length) {
      const cell = queue.pop()!;
      queued[cell] = 0;
      work++;
      const d = singleAt(k, cell);
      if (d) apply(d);
    }
    if (toOpen === 0) return { solved: true, work };
    let changed = false;
    if (logicRank(logic) >= logicRank('pair')) {
      for (let cell = 0; cell < n && !changed; cell++) {
        if (k.cells[cell]! < 0) continue;
        for (const other of partners(k, cell)) {
          work++;
          const d = pairAt(k, cell, other);
          if (d) {
            apply(d);
            changed = true;
            break;
          }
        }
      }
    }
    if (!changed && logicRank(logic) >= logicRank('all')) {
      const meter = { used: 0 };
      const found = allReasoning(k, true, meter);
      work += meter.used + n;
      for (const d of found ?? []) {
        apply(d);
        changed = true;
      }
    }
    if (!changed) return { solved: false, work };
  }
}
