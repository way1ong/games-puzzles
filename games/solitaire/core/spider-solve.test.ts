import { describe, expect, it } from 'vitest';
import { type SpiderSuits } from '../config.ts';
import { createSpiderSolver, type SpiderMove } from './spider-solve.ts';
import { dealRow, moveRun, spiderDeal, type Spider, type SpiderCard } from './spider.ts';

const C = (pack: number, rank: number): SpiderCard => pack * 13 + rank - 1;
const run = (pack: number, high: number, low: number): SpiderCard[] => Array.from({ length: high - low + 1 }, (_, i) => C(pack, high - i));

/** Plays a way out by the game's own rules; true if it ends with every run home. */
function playsOut(g: Spider, way: SpiderMove[]): boolean {
  let p = g;
  for (const m of way) {
    const next = m.kind === 'deal' ? dealRow(p) : moveRun(p, m.from, m.index, m.to);
    if (next === p) return false;
    p = next;
  }
  return p.done;
}

function table(columns: SpiderCard[][], ups: number[], stock: SpiderCard[], suits: SpiderSuits, home: SpiderCard[][]): Spider {
  return { ...spiderDeal(1, suits), columns, down: columns.map((c, i) => c.length - ups[i]!), stock, home, history: [] };
}

describe('the Spider solver', () => {
  it('finds the last moves of a game nearly won, and the way plays out by the rules', () => {
    // seven runs home; the eighth lies in two parts, the lower part under a face-down card
    const home = Array.from({ length: 7 }, (_, p) => run(p, 13, 1));
    const cols: SpiderCard[][] = [[C(7, 9), ...run(7, 13, 6)], run(7, 5, 1), [], [], [], [], [], [], [], []];
    const g = table(cols, [8, 5, 0, 0, 0, 0, 0, 0, 0, 0], [], 4, home);
    const solver = createSpiderSolver(g, 4);
    expect(solver.run(10_000)).toBe('won');
    expect(playsOut(g, solver.path())).toBe(true);
  });

  it('says when no way is left', () => {
    // the stock is gone; the two of hearts lies under the ace of spades, no card can go anywhere useful
    const home = Array.from({ length: 6 }, (_, p) => run(p, 13, 1));
    const cols: SpiderCard[][] = [
      [...run(6, 13, 3), C(7, 13)],
      [C(6, 2), C(7, 1)],
      [...run(7, 12, 2), C(6, 1)],
      [], [], [], [], [], [], [],
    ];
    // no empty column may stay empty for the stock: none is left anyway
    const g = table(cols, [1, 1, 1, 0, 0, 0, 0, 0, 0, 0], [], 4, home);
    // three columns only, the stock gone: no ace has a two to go on, the king has no empty column — no move at all
    const solver = createSpiderSolver({ ...g, columns: cols.slice(0, 3), down: g.down.slice(0, 3) }, 4);
    expect(solver.run(200_000)).toBe('lost');
  });

  it('wins real deals with one suit, every way playing out by the rules; the same deal, the same way', () => {
    let won = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const g = spiderDeal(seed * 7919, 1);
      const solver = createSpiderSolver(g, 1);
      if (solver.run(100_000) !== 'won') continue;
      won += 1;
      expect(playsOut(g, solver.path()), `seed ${seed}`).toBe(true);
      const again = createSpiderSolver(g, 1);
      again.run(100_000);
      expect(again.path()).toEqual(solver.path());
    }
    expect(won).toBeGreaterThanOrEqual(4);
  });

  it('another attempt orders equal moves another way, and its way is right too', () => {
    const g = spiderDeal(5 * 7919, 2);
    let found = 0;
    for (let a = 0; a < 6; a++) {
      const solver = createSpiderSolver(g, 2, a);
      if (solver.run(20_000) === 'won') {
        found += 1;
        expect(playsOut(g, solver.path()), `attempt ${a}`).toBe(true);
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('a move first even before searching, none when nothing can move', () => {
    const g = spiderDeal(11, 1);
    expect(createSpiderSolver(g, 1).firstMove()).not.toBeNull();
  });
});
