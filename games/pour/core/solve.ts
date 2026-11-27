// The solver: a search over pours, trying first what a person would (a pour that closes a bottle, then onto the same
// colour, an empty bottle last) and never looking at a position twice. It finds a way to the end, or shows there is
// none, or stops at its limit not knowing. The way it finds is made straight (no detours), so a hint walks it as a
// person would. Pure.
import { isClosed, isSolved, keyOf, legalMoves, pour, pourAmount, topRun, usefulMoves, type Bottles, type Move } from './bottles.ts';

export interface Solution {
  /** Pours to the end; null — none found. */
  moves: Move[] | null;
  /** The search reached its limit: when no way was found, it is not known whether there is one. */
  capped: boolean;
  /** Positions looked at. */
  nodes: number;
}

/** Where every bottle stands too (pours never move a bottle): a way's positions are told apart by this. */
export function placeKey(bottles: Bottles): string {
  return bottles.map((b) => b.join(',')).join('|');
}

/** 0 — closes a bottle; 1 — the whole top colour onto the same colour; 2 — part of it; 3 — into an empty bottle. */
function rank(bottles: Bottles, move: Move, capacity: number): number {
  const a = bottles[move.from]!;
  const b = bottles[move.to]!;
  const n = pourAmount(bottles, move, capacity);
  if (b.length && topRun(b) === b.length && b.length + n === capacity) return 0;
  if (!b.length) return 3;
  return n === topRun(a) ? 1 : 2;
}

/** The pours worth trying, in the order a person would try them. */
export function orderedMoves(bottles: Bottles, capacity: number): Move[] {
  return usefulMoves(bottles, capacity)
    .map((move, i) => ({ move, i, r: rank(bottles, move, capacity) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.move);
}

/** A found way made straight: from each position, the pour to the furthest later position of the way it reaches. */
export function straighten(start: Bottles, moves: readonly Move[], capacity: number): Move[] {
  const states: Bottles[] = [start];
  for (const m of moves) states.push(pour(states[states.length - 1]!, m, capacity));
  const last = new Map<string, number>();
  states.forEach((s, i) => last.set(placeKey(s), i));
  const out: Move[] = [];
  for (let i = 0; i < states.length - 1; ) {
    let best = { j: i + 1, move: moves[i]! };
    for (const m of legalMoves(states[i]!, capacity)) {
      const j = last.get(placeKey(pour(states[i]!, m, capacity)));
      if (j !== undefined && j > best.j) best = { j, move: m };
    }
    out.push(best.move);
    i = best.j;
  }
  return out;
}

interface Frame {
  bottles: Bottles;
  moves: Move[];
  next: number;
  /** The pour that led here. */
  by: Move | null;
}

/** Looks for a way from `start` to the end, looking at no more than `limit` positions. */
export function solve(start: Bottles, capacity: number, limit: number): Solution {
  if (isSolved(start, capacity)) return { moves: [], capped: false, nodes: 0 };
  const seen = new Set<string>([keyOf(start)]);
  const stack: Frame[] = [{ bottles: start, moves: orderedMoves(start, capacity), next: 0, by: null }];
  let nodes = 0;
  while (stack.length) {
    const top = stack[stack.length - 1]!;
    if (top.next >= top.moves.length) {
      stack.pop();
      continue;
    }
    const move = top.moves[top.next++]!;
    const after = pour(top.bottles, move, capacity);
    const key = keyOf(after);
    if (seen.has(key)) continue;
    seen.add(key);
    if (++nodes > limit) return { moves: null, capped: true, nodes };
    if (isSolved(after, capacity)) {
      const way = [...stack.slice(1).map((f) => f.by!), move];
      return { moves: straighten(start, way, capacity), capped: false, nodes };
    }
    stack.push({ bottles: after, moves: orderedMoves(after, capacity), next: 0, by: move });
  }
  return { moves: null, capped: false, nodes };
}

/** Bottles already closed (full of one colour): counted for a hint's words and the end. */
export function closedCount(bottles: Bottles, capacity: number): number {
  return bottles.filter((b) => isClosed(b, capacity)).length;
}
