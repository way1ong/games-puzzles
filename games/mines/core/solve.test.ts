// The solver: every step it takes is certain — checked against every way the mines could lie (small fields, all of
// them counted out); the reasoning over all the numbers together finds every cell that is certain; one number alone,
// and two numbers that share cells, on made-up positions.
import { describe, expect, it } from 'vitest';
import { nextInt } from '../../../shared/core/rng.ts';
import { layMines, mineMap, neighbourTable, numbers, type Field } from './field.ts';
import { CLOSED, MINE, allReasoning, nextStep, pairAt, singleAt, solveField, type Deduction, type Knowledge } from './solve.ts';

/** A position from a field: `open` cells show their numbers, `flagged` cells are known mines. */
function knowledge(field: Field, open: Iterable<number>, flagged: Iterable<number> = []): Knowledge {
  const nums = numbers(field);
  const cells = new Int8Array(field.width * field.height).fill(CLOSED);
  for (const c of open) cells[c] = nums[c]!;
  for (const c of flagged) cells[c] = MINE;
  return { width: field.width, height: field.height, mines: field.mines.length, cells };
}

/**
 * Every way the mines could lie that agrees with the open numbers (and, with `count`, the number of mines): for each
 * closed cell, whether some way puts a mine there and some way leaves it safe.
 */
function everyWay(k: Knowledge, count: boolean): { mineSome: boolean[]; safeSome: boolean[]; ways: number } {
  const table = neighbourTable(k);
  const n = k.cells.length;
  const closed: number[] = [];
  let known = 0;
  for (let c = 0; c < n; c++) {
    if (k.cells[c] === CLOSED) closed.push(c);
    else if (k.cells[c] === MINE) known++;
  }
  const mineSome = new Array<boolean>(n).fill(false);
  const safeSome = new Array<boolean>(n).fill(false);
  let ways = 0;
  for (let mask = 0; mask < 1 << closed.length; mask++) {
    const mine = new Uint8Array(n);
    let total = known;
    for (let c = 0; c < n; c++) if (k.cells[c] === MINE) mine[c] = 1;
    closed.forEach((cell, i) => {
      if (mask & (1 << i)) {
        mine[cell] = 1;
        total++;
      }
    });
    if (count && total !== k.mines) continue;
    let fits = true;
    for (let c = 0; c < n && fits; c++) {
      const v = k.cells[c]!;
      if (v < 0) continue;
      let around = 0;
      for (const o of table[c]!) around += mine[o]!;
      if (around !== v) fits = false;
    }
    if (!fits) continue;
    ways++;
    for (const cell of closed) {
      if (mine[cell]) mineSome[cell] = true;
      else safeSome[cell] = true;
    }
  }
  return { mineSome, safeSome, ways };
}

/** A random position of a small field: some safe cells open, some mines flagged. */
function randomPosition(seed: number): { field: Field; k: Knowledge } {
  const size = { width: 5, height: 4 };
  let state = seed;
  const start = nextInt(state, 20);
  state = start.state;
  const mines = nextInt(state, 5);
  state = mines.state;
  const { field } = layMines(size, 3 + mines.value, start.value, state);
  const mine = mineMap(field);
  const open: number[] = [];
  const flagged: number[] = [];
  for (let cell = 0; cell < 20; cell++) {
    const draw = nextInt(state + cell * 7919, 10);
    if (!mine[cell] && draw.value < 5) open.push(cell);
    if (mine[cell] && draw.value < 2) flagged.push(cell);
  }
  return { field, k: knowledge(field, open, flagged) };
}

const certain = (d: Deduction, ways: ReturnType<typeof everyWay>) => d.safe.every((c) => !ways.mineSome[c]) && d.mines.every((c) => !ways.safeSome[c]);

describe('every step is certain', () => {
  it('one number, two numbers, and all of them together — checked against every way the mines could lie', () => {
    let checked = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const { k } = randomPosition(seed * 2654435761);
      const loose = everyWay(k, false);
      const counted = everyWay(k, true);
      if (counted.ways === 0) continue;
      for (let cell = 0; cell < 20; cell++) {
        const d = singleAt(k, cell);
        if (d) {
          expect(certain(d, loose)).toBe(true);
          checked++;
        }
        for (let other = cell + 1; other < 20; other++) {
          const p = pairAt(k, cell, other);
          if (p) {
            expect(certain(p, loose)).toBe(true);
            checked++;
          }
        }
      }
      for (const d of allReasoning(k, false) ?? []) {
        expect(certain(d, loose)).toBe(true);
        checked++;
      }
      for (const d of allReasoning(k, true) ?? []) {
        expect(certain(d, counted)).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it('all the numbers together find every cell that is certain, with the number of mines and without', () => {
    let found = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const { k } = randomPosition(seed * 40503 + 17);
      for (const count of [false, true]) {
        const ways = everyWay(k, count);
        if (ways.ways === 0) continue;
        const sure = new Set<number>();
        for (let cell = 0; cell < 20; cell++) if (k.cells[cell] === CLOSED && (!ways.mineSome[cell] || !ways.safeSome[cell])) sure.add(cell);
        // without the count, cells away from every number are never certain
        const got = new Set((allReasoning(k, count) ?? []).flatMap((d) => [...d.safe, ...d.mines]));
        expect([...got].sort((a, b) => a - b)).toEqual([...sure].sort((a, b) => a - b));
        found += sure.size;
      }
    }
    expect(found).toBeGreaterThan(100);
  });
});

describe('each kind finds all it can', () => {
  it('two numbers: every cell their two counts alone decide (checked against every way)', () => {
    let pairs = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const { k } = randomPosition(seed * 69069 + 5);
      const table = neighbourTable(k);
      const closedOf = (cell: number) => [...table[cell]!].filter((o) => k.cells[o] === CLOSED);
      const needOf = (cell: number) => k.cells[cell]! - [...table[cell]!].filter((o) => k.cells[o] === MINE).length;
      for (let a = 0; a < 20; a++) {
        for (let b = a + 1; b < 20; b++) {
          if (k.cells[a]! < 0 || k.cells[b]! < 0) continue;
          const ca = closedOf(a);
          const cb = closedOf(b);
          if (!ca.length || !cb.length || !ca.some((c) => cb.includes(c))) continue;
          const cells = [...new Set([...ca, ...cb])];
          const mineSome = new Set<number>();
          const safeSome = new Set<number>();
          for (let mask = 0; mask < 1 << cells.length; mask++) {
            const on = (c: number) => (mask >> cells.indexOf(c)) & 1;
            if (ca.reduce((t, c) => t + on(c), 0) !== needOf(a) || cb.reduce((t, c) => t + on(c), 0) !== needOf(b)) continue;
            for (const c of cells) (on(c) ? mineSome : safeSome).add(c);
          }
          const sure = cells.filter((c) => !mineSome.has(c) || !safeSome.has(c)).sort((x, y) => x - y);
          const d = pairAt(k, a, b);
          expect(d ? [...d.safe, ...d.mines].sort((x, y) => x - y) : []).toEqual(sure);
          pairs++;
        }
      }
    }
    expect(pairs).toBeGreaterThan(200);
  });
});

describe('the kinds of reasoning', () => {
  // cells are numbered row by row: on a field 4 wide, 0 1 2 3 / 4 5 6 7 / 8 9 10 11
  const field = (mines: number[]): Field => ({ width: 4, height: 3, mines, start: 0 });

  it('one number: all its mines known — the rest safe; as many closed as mines left — all mines', () => {
    // mines at 5 and 7; the 1 at cell 4 touches 0, 1 (open), 5 (flagged), 8 and 9 (closed): they are safe
    const f = field([5, 7]);
    const k = knowledge(f, [0, 1, 2, 3, 4], [5]);
    const d = singleAt(k, 4)!;
    expect(d).toEqual({ logic: 'single', safe: [8, 9], mines: [], from: [4], count: false });
    // with nothing flagged, the 1 at cell 0 has one closed neighbour, 5: a mine
    const k2 = knowledge(f, [0, 1, 2, 3, 4, 8, 9]);
    expect(singleAt(k2, 0)).toEqual({ logic: 'single', safe: [], mines: [5], from: [0], count: false });
  });

  it('two numbers: the "1-2" at a wall', () => {
    // a field 3 wide: the top row 0 1 2 open (1 2 2), the bottom row 3 4 5 closed, mines at 4 and 5.
    // Neither 0 nor 1 decides alone; together: the 1 at 0 has its mine in 3 or 4, the 2 at 1 touches 3, 4 and 5 — one
    // mine in 3 or 4, so the other is 5. (The 2 at cell 2, with two closed neighbours, is a step of one number.)
    const f: Field = { width: 3, height: 2, mines: [4, 5], start: 0 };
    const k = knowledge(f, [0, 1, 2]);
    expect(singleAt(k, 0)).toBeNull();
    expect(singleAt(k, 1)).toBeNull();
    const p = pairAt(k, 0, 1)!;
    expect(p.logic).toBe('pair');
    expect(p.mines).toEqual([5]);
    expect(p.safe).toEqual([]);
    expect(nextStep(k, 'single')).toEqual({ logic: 'single', safe: [], mines: [4, 5], from: [2], count: false });
  });

  it('the number of mines left decides the cells away from the numbers', () => {
    // 4 × 1: open 0 shows 1 (mine at 1); cells 2, 3 away from every number; with one mine in all — they are safe
    const f: Field = { width: 4, height: 1, mines: [1], start: 0 };
    const k = knowledge(f, [0]);
    expect(singleAt(k, 0)).toEqual({ logic: 'single', safe: [], mines: [1], from: [0], count: false });
    const k2 = knowledge(f, [0], [1]);
    const all = allReasoning(k2, true)!;
    expect(all).toEqual([{ logic: 'all', safe: [2, 3], mines: [], from: [], count: true }]);
    expect(allReasoning(k2, false)).toEqual([]);
  });
});

describe('solving a whole field', () => {
  it('more reasoning solves at least as much: a field solved with one number at a time is solved with all', () => {
    let solvedSingle = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const { field } = layMines({ width: 9, height: 9 }, 12, 40, seed * 7919);
      const single = solveField(field, 'single').solved;
      const pair = solveField(field, 'pair').solved;
      const all = solveField(field, 'all').solved;
      if (single) solvedSingle++;
      if (single) expect(pair).toBe(true);
      if (pair) expect(all).toBe(true);
    }
    expect(solvedSingle).toBeGreaterThan(0);
  });
});
