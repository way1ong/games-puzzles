// FreeCell's solver (docs/solitaire/SPEC.md, "Вільні клітинки"): looks for a way to send every card home. Best first:
// of the positions reached, the one that looks closest to the end is taken next (score()), and in slices: `run(steps)`
// goes on from where it stopped, so the screen keeps working in between. A position is remembered without the order of
// the columns and of the free cells (two positions that differ only in it are one), so the same position is not looked
// at twice. A card no longer needed goes home at once: with the player's "home by themselves" on, as the game does it;
// with it off, as the only move tried (it never makes the deal harder). Pure, no DOM.
import { KING, rankOf, suitOf } from './cards.ts';
import { homeForGood, type FreePlace, type FreeTable } from './freecell.ts';
import { fitsOn } from './klondike.ts';

/** A move of the solver: cards from a place (from `index` up, for a column) to another place. */
export interface FreeMove {
  from: FreePlace;
  index: number;
  to: FreePlace;
}

export type FreeSolveStatus = 'won' | 'lost' | 'more';

export interface FreeSolver {
  /** Goes on for at most `steps` more positions; 'more' — not decided yet. */
  run(steps: number): FreeSolveStatus;
  /** After 'won': the way, the first move first. */
  path(): FreeMove[];
  /** The move that looks best from the starting position and does not lead back to `notBackTo`; null — no move at all. */
  firstMove(): FreeMove | null;
  /**
   * A way from the starting position made straight: wherever one move reaches a position the way comes to later, the
   * moves in between are left out. The same end, in fewer moves.
   */
  straighten(path: readonly FreeMove[]): FreeMove[];
  /** Positions looked at so far. */
  readonly steps: number;
}

const SUITS = 4;
const ALL = SUITS * KING;

/** What a move did, to take it back: the move, the cards moved, the cards that went home after it (where from, which suit). */
interface Done {
  move: FreeMove;
  count: number;
  homes: { from: FreePlace; suit: number }[];
}

interface Node {
  parent: number;
  move: FreeMove | null;
  /** The position, to go on from it: the foundations, the cells (255 — empty), then each column's length and cards. */
  data: Uint8Array;
}

const column = (index: number): FreePlace => ({ kind: 'column', index });
const cellAt = (index: number): FreePlace => ({ kind: 'cell', index });
const home = (suit: number): FreePlace => ({ kind: 'foundation', suit });

/**
 * `autoHome` — whether the cards no longer needed go home by themselves after each move (the player's setting): the
 * way found is then made of the player's own moves. `notBackTo` — positions the game has just been in: firstMove() is
 * one that does not lead back to them.
 */
export function createFreeSolver(table: FreeTable, autoHome: boolean, notBackTo: readonly FreeTable[] = []): FreeSolver {
  let cols = table.columns.map((c) => [...c]);
  let cells = table.cells.map((c) => (c === null ? -1 : c));
  let found = [...table.foundations];
  const COLS = cols.length;
  const CELLS = cells.length;

  // ---------- doing and undoing ----------
  /** The card at a place a card can leave from: a column's top or a free cell; -1 — none. */
  function cardAt(p: FreePlace): number {
    if (p.kind === 'cell') return cells[p.index]!;
    if (p.kind === 'column') return cols[p.index]!.at(-1) ?? -1;
    return -1;
  }

  /** The lowest card no longer needed at a column's top or in a free cell. */
  function safeOne(): FreePlace | null {
    let best: FreePlace | null = null;
    let bestRank = KING + 1;
    for (let i = 0; i < COLS; i++) {
      const card = cols[i]!.at(-1);
      if (card !== undefined && rankOf(card) < bestRank && homeForGood(found, card)) {
        best = column(i);
        bestRank = rankOf(card);
      }
    }
    for (let i = 0; i < CELLS; i++) {
      const card = cells[i]!;
      if (card >= 0 && rankOf(card) < bestRank && homeForGood(found, card)) {
        best = cellAt(i);
        bestRank = rankOf(card);
      }
    }
    return best;
  }

  function apply(m: FreeMove): Done {
    let moving: number[];
    if (m.from.kind === 'cell') {
      moving = [cells[m.from.index]!];
      cells[m.from.index] = -1;
    } else moving = cols[(m.from as { index: number }).index]!.splice(m.index);
    if (m.to.kind === 'foundation') found[m.to.suit] = rankOf(moving[0]!);
    else if (m.to.kind === 'cell') cells[m.to.index] = moving[0]!;
    else cols[m.to.index]!.push(...moving);
    const homes: Done['homes'] = [];
    if (autoHome) {
      for (let p = safeOne(); p; p = safeOne()) {
        const card = cardAt(p);
        if (p.kind === 'cell') cells[p.index] = -1;
        else cols[(p as { index: number }).index]!.pop();
        found[suitOf(card)] = rankOf(card);
        homes.push({ from: p, suit: suitOf(card) });
      }
    }
    return { move: m, count: moving.length, homes };
  }

  function revert(d: Done): void {
    for (let k = d.homes.length - 1; k >= 0; k--) {
      const { from, suit } = d.homes[k]!;
      const card = suit * KING + found[suit]! - 1;
      found[suit]! -= 1;
      if (from.kind === 'cell') cells[from.index] = card;
      else cols[(from as { index: number }).index]!.push(card);
    }
    const { from, to } = d.move;
    let moving: number[];
    if (to.kind === 'foundation') {
      moving = [to.suit * KING + found[to.suit]! - 1];
      found[to.suit]! -= 1;
    } else if (to.kind === 'cell') {
      moving = [cells[to.index]!];
      cells[to.index] = -1;
    } else moving = cols[to.index]!.splice(cols[to.index]!.length - d.count);
    if (from.kind === 'cell') cells[from.index] = moving[0]!;
    else cols[(from as { index: number }).index]!.push(...moving);
  }

  // ---------- moves ----------
  /** How many cards in order may move together, to a card or into an empty column. */
  function limit(intoEmpty: boolean): number {
    let free = 0;
    for (const c of cells) if (c < 0) free++;
    let empty = 0;
    for (const col of cols) if (col.length === 0) empty++;
    return (free + 1) * 2 ** Math.max(0, empty - (intoEmpty ? 1 : 0));
  }

  /** Where the cards in order at a column's top start. */
  function orderStart(i: number): number {
    const col = cols[i]!;
    let s = col.length - 1;
    while (s > 0 && fitsOn(col[s]!, col[s - 1]!)) s -= 1;
    return s;
  }

  /**
   * The moves to try: a card no longer needed home, alone (it never makes the deal harder); else every card that can go
   * home; the part of a run that fits on another column's top; into an empty column every part of a run that may go
   * there (never a whole column: nothing changes); a top card into a free cell; a card from a free cell onto a column.
   * Empty columns are alike, and so are empty cells: one of each is tried. Nothing else is left out, so a search that
   * runs out of positions has shown that no way is left.
   */
  function moves(): FreeMove[] {
    const safe = safeOne();
    if (safe) {
      const card = cardAt(safe);
      return [{ from: safe, index: safe.kind === 'cell' ? 0 : cols[(safe as { index: number }).index]!.length - 1, to: home(suitOf(card)) }];
    }
    const out: FreeMove[] = [];
    const emptyCol = cols.findIndex((c) => c.length === 0);
    const cell = cells.indexOf(-1);
    for (let i = 0; i < COLS; i++) {
      const col = cols[i]!;
      const card = col.at(-1);
      if (card !== undefined && found[suitOf(card)] === rankOf(card) - 1) out.push({ from: column(i), index: col.length - 1, to: home(suitOf(card)) });
    }
    for (let i = 0; i < CELLS; i++) {
      const card = cells[i]!;
      if (card >= 0 && found[suitOf(card)] === rankOf(card) - 1) out.push({ from: cellAt(i), index: 0, to: home(suitOf(card)) });
    }
    const toCard = limit(false);
    const toEmpty = limit(true);
    for (let i = 0; i < COLS; i++) {
      const col = cols[i]!;
      if (col.length === 0) continue;
      const s = orderStart(i);
      const top = col.length - 1;
      for (let j = 0; j < COLS; j++) {
        const target = cols[j]!;
        if (j === i || target.length === 0) continue;
        const under = target[target.length - 1]!;
        // the card of the run that fits on `under`: one rank lower, the other colour — at most one
        const k = top - (rankOf(under) - 1 - rankOf(col[top]!));
        if (k >= s && k <= top && fitsOn(col[k]!, under) && top - k + 1 <= toCard) out.push({ from: column(i), index: k, to: column(j) });
      }
      // into an empty column: every part of the run that may go there, the longest first; never a whole column
      if (emptyCol >= 0) for (let k = Math.max(s, col.length - toEmpty, 1); k <= top; k++) out.push({ from: column(i), index: k, to: column(emptyCol) });
      if (cell >= 0) out.push({ from: column(i), index: top, to: cellAt(cell) });
    }
    for (let i = 0; i < CELLS; i++) {
      const card = cells[i]!;
      if (card < 0) continue;
      for (let j = 0; j < COLS; j++) {
        const target = cols[j]!;
        if (target.length > 0 && fitsOn(card, target[target.length - 1]!)) out.push({ from: cellAt(i), index: 0, to: column(j) });
      }
      if (emptyCol >= 0) out.push({ from: cellAt(i), index: 0, to: column(emptyCol) });
    }
    return out;
  }

  /** Every move the rules allow (to make a way straight): any part of a run that may go, every place. */
  function allMoves(): FreeMove[] {
    const out: FreeMove[] = [];
    const toCard = limit(false);
    const toEmpty = limit(true);
    const cell = cells.indexOf(-1);
    for (let i = 0; i < COLS; i++) {
      const col = cols[i]!;
      if (col.length === 0) continue;
      const top = col.length - 1;
      if (found[suitOf(col[top]!)] === rankOf(col[top]!) - 1) out.push({ from: column(i), index: top, to: home(suitOf(col[top]!)) });
      for (let k = orderStart(i); k <= top; k++) {
        const n = top - k + 1;
        for (let j = 0; j < COLS; j++) {
          if (j === i) continue;
          const target = cols[j]!;
          if (target.length === 0 ? n <= toEmpty : n <= toCard && fitsOn(col[k]!, target[target.length - 1]!)) out.push({ from: column(i), index: k, to: column(j) });
        }
      }
      if (cell >= 0) out.push({ from: column(i), index: top, to: cellAt(cell) });
    }
    for (let i = 0; i < CELLS; i++) {
      const card = cells[i]!;
      if (card < 0) continue;
      if (found[suitOf(card)] === rankOf(card) - 1) out.push({ from: cellAt(i), index: 0, to: home(suitOf(card)) });
      for (let j = 0; j < COLS; j++) {
        const target = cols[j]!;
        if (target.length === 0 || fitsOn(card, target[target.length - 1]!)) out.push({ from: cellAt(i), index: 0, to: column(j) });
      }
    }
    return out;
  }

  // ---------- positions ----------
  function mix(h: number, v: number): number {
    h = Math.imul(h ^ v, 0x01000193) >>> 0;
    h ^= h >>> 13;
    return Math.imul(h, 0x5bd1e995) >>> 0;
  }

  /**
   * A position as a number (two 32-bit sums in one), the same whatever the order of the columns and of the cells: each
   * column's cards make a number of its own, and the numbers are added. Two positions with one number would make the
   * search skip one of them — it could miss a way, never claim a false one (a way is played out move by move).
   */
  function key(): number {
    let a = 0;
    let b = 0;
    for (let i = 0; i < COLS; i++) {
      const col = cols[i]!;
      let h1 = 0x811c9dc5 ^ col.length;
      let h2 = 0x9747b28c ^ (col.length * 31);
      for (let k = 0; k < col.length; k++) {
        h1 = mix(h1, col[k]! + 1);
        h2 = mix(h2, col[k]! + 101);
      }
      a = (a + h1) >>> 0;
      b = (b + h2) >>> 0;
    }
    for (let i = 0; i < CELLS; i++) {
      const c = cells[i]!;
      if (c < 0) continue;
      a = (a + mix(0x2545f491, c + 7)) >>> 0;
      b = (b + mix(0x6c8e9cf5, c + 211)) >>> 0;
    }
    for (let s = 0; s < SUITS; s++) {
      a = mix(a, found[s]! + 16 * s);
      b = mix(b, found[s]! * 7 + s);
    }
    return a * 0x200000 + (b & 0x1fffff);
  }

  /**
   * The position as it lies, the order of the columns and of the cells too: a way's moves name their columns and cells,
   * so making a way straight may only join it where everything lies the same.
   */
  function exactKey(): number {
    let a = 0x811c9dc5;
    let b = 0x9747b28c;
    for (let i = 0; i < COLS; i++) {
      const col = cols[i]!;
      a = mix(a, 1000 + col.length);
      b = mix(b, 2000 + col.length);
      for (let k = 0; k < col.length; k++) {
        a = mix(a, col[k]! + 1);
        b = mix(b, col[k]! + 101);
      }
    }
    for (let i = 0; i < CELLS; i++) {
      a = mix(a, cells[i]! + 3);
      b = mix(b, cells[i]! + 307);
    }
    for (let s = 0; s < SUITS; s++) {
      a = mix(a, found[s]! + 16 * s);
      b = mix(b, found[s]! * 7 + s);
    }
    return a * 0x200000 + (b & 0x1fffff);
  }

  const won = (): boolean => found.every((f) => f === KING);

  /**
   * How far a position looks from the end, lower is closer (C): the cards not home; the cards lying above a lower card
   * in their column (each must move before that one can go home); the cards on top of each suit's next card; the full
   * free cells; and, the other way, the empty columns.
   */
  function score(): number {
    let homeNow = 0;
    for (const f of found) homeNow += f;
    let above = 0;
    let depth = 0;
    for (let i = 0; i < COLS; i++) {
      const col = cols[i]!;
      let low = KING + 1;
      for (let k = 0; k < col.length; k++) {
        const r = rankOf(col[k]!);
        if (r > low) above += 1;
        else low = r;
        if (found[suitOf(col[k]!)] === r - 1) depth += col.length - 1 - k;
      }
    }
    let full = 0;
    for (const c of cells) if (c >= 0) full += 1;
    let empty = 0;
    for (const col of cols) if (col.length === 0) empty += 1;
    return ALL - homeNow + above + depth + full - 2 * empty;
  }

  // ---------- the search ----------
  const nodes: Node[] = [];
  const seen = new Set<number>();
  /** The positions to go on from: a heap by score, then by the order they were reached. */
  const heapScore: number[] = [];
  const heapNode: number[] = [];
  let steps = 0;
  let status: FreeSolveStatus = 'more';
  let way: FreeMove[] = [];

  const before = (i: number, j: number) => heapScore[i]! < heapScore[j]! || (heapScore[i] === heapScore[j] && heapNode[i]! < heapNode[j]!);
  const swap = (i: number, j: number) => {
    [heapScore[i], heapScore[j]] = [heapScore[j]!, heapScore[i]!];
    [heapNode[i], heapNode[j]] = [heapNode[j]!, heapNode[i]!];
  };
  function push(s: number, n: number): void {
    heapScore.push(s);
    heapNode.push(n);
    for (let i = heapScore.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!before(i, p)) break;
      swap(i, p);
      i = p;
    }
  }
  function pop(): number | null {
    if (heapScore.length === 0) return null;
    const top = heapNode[0]!;
    const lastS = heapScore.pop()!;
    const lastN = heapNode.pop()!;
    if (heapScore.length > 0) {
      heapScore[0] = lastS;
      heapNode[0] = lastN;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heapScore.length && before(l, m)) m = l;
        if (r < heapScore.length && before(r, m)) m = r;
        if (m === i) break;
        swap(i, m);
        i = m;
      }
    }
    return top;
  }

  function snapshot(parent: number, move: FreeMove | null): Node {
    let size = SUITS + CELLS + COLS;
    for (const col of cols) size += col.length;
    const data = new Uint8Array(size);
    let at = 0;
    for (const f of found) data[at++] = f;
    for (const c of cells) data[at++] = c < 0 ? 255 : c;
    for (const col of cols) {
      data[at++] = col.length;
      for (const card of col) data[at++] = card;
    }
    return { parent, move, data };
  }
  function load(n: Node): void {
    const data = n.data;
    let at = 0;
    found = Array.from(data.subarray(0, SUITS));
    at = SUITS;
    cells = Array.from(data.subarray(at, at + CELLS), (c) => (c === 255 ? -1 : c));
    at += CELLS;
    cols = [];
    for (let i = 0; i < COLS; i++) {
      const length = data[at++]!;
      cols.push(Array.from(data.subarray(at, at + length)));
      at += length;
    }
  }
  function wayTo(n: number): FreeMove[] {
    const out: FreeMove[] = [];
    for (let i = n; i > 0; i = nodes[i]!.parent) out.push(nodes[i]!.move!);
    return out.reverse();
  }

  const start = snapshot(-1, null);
  nodes.push(start);
  seen.add(key());
  if (won()) status = 'won';
  else push(score(), 0);

  // The first move: the best-looking one that leads neither to the start nor back to where the game has just been.
  const back = new Set<number>([key()]);
  for (const t of notBackTo) {
    cols = t.columns.map((c) => [...c]);
    cells = t.cells.map((c) => (c === null ? -1 : c));
    found = [...t.foundations];
    back.add(key());
  }
  load(start);
  let first: FreeMove | null = null;
  let firstScore = Infinity;
  for (const m of moves()) {
    const done = apply(m);
    const s = won() ? -Infinity : back.has(key()) ? Infinity : score();
    revert(done);
    if (first === null || s < firstScore) {
      first = m;
      firstScore = s;
    }
  }

  return {
    get steps() {
      return steps;
    },
    run(limitSteps) {
      if (status !== 'more') return status;
      const stop = steps + limitSteps;
      for (;;) {
        const n = pop();
        if (n === null) {
          status = 'lost';
          return status;
        }
        load(nodes[n]!);
        for (const m of moves()) {
          const done = apply(m);
          if (won()) {
            way = [...wayTo(n), m];
            status = 'won';
            return status;
          }
          const k = key();
          if (!seen.has(k)) {
            seen.add(k);
            steps += 1;
            nodes.push(snapshot(n, m));
            push(score(), nodes.length - 1);
          }
          revert(done);
        }
        if (steps >= stop) return 'more';
      }
    },
    path() {
      return way;
    },
    firstMove() {
      return first;
    },
    straighten(path) {
      load(start);
      // where the way comes, position by position
      const at = new Map<number, number>([[exactKey(), 0]]);
      const dones: Done[] = [];
      for (const m of path) {
        dones.push(apply(m));
        at.set(exactKey(), dones.length);
      }
      for (let k = dones.length - 1; k >= 0; k--) revert(dones[k]!);
      const out: FreeMove[] = [];
      let i = 0;
      while (i < path.length) {
        let bestTo = i + 1;
        let best = path[i]!;
        for (const m of allMoves()) {
          const done = apply(m);
          const to = won() ? path.length : (at.get(exactKey()) ?? -1);
          revert(done);
          if (to > bestTo) {
            bestTo = to;
            best = m;
          }
        }
        out.push(best);
        apply(best);
        i = bestTo;
      }
      load(start);
      return out;
    },
  };
}
