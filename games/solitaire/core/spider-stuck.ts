// When Spider says, unasked, that no way to the end is left (docs/solitaire/SPEC.md, "Павук"): no move that leads
// anywhere is left — the solver, which tries every such move and the stock too, has none (the stock is dealt, or cannot
// be: an empty column that no card can fill). Only then is the hint's search asked, quietly; never right after a move,
// so the game does not give the face-down cards away. Pure.
import { createSpiderSolver } from './spider-solve.ts';
import type { Spider } from './spider.ts';

/** No move that leads anywhere is left: worth asking the solver whether a way is left. */
export function spiderStuck(g: Spider): boolean {
  return !g.done && createSpiderSolver(g, g.suits).firstMove() === null;
}
