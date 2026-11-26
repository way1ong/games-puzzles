// Spider's solver (docs/solitaire/SPEC.md, "Павук"): looks for a way to send all eight runs home, knowing every card,
// the face-down ones and the stock too. Depth first, with a memory of positions already seen, and in slices: `run(steps)`
// goes on from where it stopped, so the screen keeps working in between. Moves are tried in an order a good player
// would (see moves()). Moves that change nothing that matters — a run onto another card like the one it lies on, a whole
// column into an empty one — are not tried. Pure, no DOM.
import { SOLITAIRE, type SpiderSuits } from '../config.ts';
import { spiderRank, spiderSuit, type SpiderCard, type SpiderTable } from './spider.ts';

const RANKS = SOLITAIRE.deck.ranks;
const RUNS = SOLITAIRE.spider.runs;

/** A move of the solver: the cards of a column from `index` up onto another column, or a deal from the stock. */
export type SpiderMove = { kind: 'move'; from: number; index: number; to: number } | { kind: 'deal' };

export type SolveStatus = 'won' | 'lost' | 'more';

export interface SpiderSolver {
  /** Goes on for at most `steps` more positions; 'more' — not decided yet. */
  run(steps: number): SolveStatus;
  /** After 'won': the way, the first move first. */
  path(): SpiderMove[];
  /** The move the search tries first from the starting position; null — none at all. */
  firstMove(): SpiderMove | null;
  /** Positions looked at so far. */
  readonly steps: number;
}

/** A move done, with what is needed to take it back. */
type Done =
  | { kind: 'move'; from: number; to: number; count: number; flipped: boolean; home: Home | null }
  | { kind: 'deal'; homes: Home[] };

/** A run sent home: the column, its cards, and whether a card turned up under it. */
interface Home {
  column: number;
  cards: SpiderCard[];
  flipped: boolean;
}

interface Frame {
  moves: SpiderMove[];
  next: number;
  /** The move that led here (taken back when the frame is left); null for the start. */
  done: Done | null;
}

/**
 * `attempt` changes the order of moves that are equally good (0 — none): a search that went deep down a wrong way can
 * be started again along another (spiderSearch).
 */
export function createSpiderSolver(table: SpiderTable, suits: SpiderSuits, attempt = 0): SpiderSolver {
  const cols = table.columns.map((c) => [...c]);
  const down = [...table.down];
  const stock = [...table.stock];
  let dealt = 0;
  let home = table.home.length;
  const seen = new Set<number>();
  let steps = 0;
  let status: SolveStatus = 'more';
  let way: SpiderMove[] = [];

  const suit = (card: SpiderCard) => spiderSuit(card, suits);
  const follows = (card: SpiderCard, under: SpiderCard) => spiderRank(under) === spiderRank(card) + 1 && suit(under) === suit(card);

  // ---------- doing and undoing ----------
  function runStart(i: number): number {
    const col = cols[i]!;
    let s = col.length - 1;
    while (s - 1 >= down[i]! && follows(col[s]!, col[s - 1]!)) s -= 1;
    return s;
  }

  function turnUp(i: number): boolean {
    const col = cols[i]!;
    if (col.length > 0 && down[i]! >= col.length) {
      down[i] = col.length - 1;
      return true;
    }
    return false;
  }

  function goHome(i: number): Home | null {
    const col = cols[i]!;
    if (col.length < RANKS || col.length - RANKS < down[i]! || spiderRank(col[col.length - 1]!) !== 1) return null;
    for (let k = col.length - 1; k > col.length - RANKS; k--) if (!follows(col[k]!, col[k - 1]!)) return null;
    const cards = col.splice(col.length - RANKS, RANKS);
    home += 1;
    return { column: i, cards, flipped: turnUp(i) };
  }

  function comeBack(h: Home): void {
    if (h.flipped) down[h.column]! += 1;
    cols[h.column]!.push(...h.cards);
    home -= 1;
  }

  function apply(m: SpiderMove): Done {
    if (m.kind === 'deal') {
      for (let i = 0; i < cols.length; i++) cols[i]!.push(stock[dealt + i]!);
      dealt += cols.length;
      const homes: Home[] = [];
      for (let i = 0; i < cols.length; i++) {
        const h = goHome(i);
        if (h) homes.push(h);
      }
      return { kind: 'deal', homes };
    }
    const moving = cols[m.from]!.splice(m.index);
    cols[m.to]!.push(...moving);
    const flipped = turnUp(m.from);
    return { kind: 'move', from: m.from, to: m.to, count: moving.length, flipped, home: goHome(m.to) };
  }

  function revert(d: Done): void {
    if (d.kind === 'deal') {
      for (let k = d.homes.length - 1; k >= 0; k--) comeBack(d.homes[k]!);
      for (const col of cols) col.pop();
      dealt -= cols.length;
      return;
    }
    if (d.home) comeBack(d.home);
    if (d.flipped) down[d.from]! += 1;
    const to = cols[d.to]!;
    cols[d.from]!.push(...to.splice(to.length - d.count));
  }

  // ---------- moves ----------
  /** How many cards at the top of a column make one run. */
  const runLength = (i: number) => cols[i]!.length - runStart(i);

  /** Whether some column other than `skip` has a card the run starting with `card` would join (same suit, one higher). */
  function joinable(card: SpiderCard, skip: number, extraTop: SpiderCard | null, extraAt: number): boolean {
    for (let m = 0; m < cols.length; m++) {
      if (m === skip) continue;
      const top = m === extraAt && extraTop !== null ? extraTop : cols[m]![cols[m]!.length - 1];
      if (top !== undefined && follows(card, top)) return true;
    }
    return false;
  }

  /**
   * The moves worth trying, best first (C): a whole run onto a card of its suit (first where that turns a card up or
   * empties the column, from the columns with more face-down cards), a whole run onto any card where that turns a card up,
   * part of a run onto a longer run of its suit, the stock; then a run moved off a card only so that this card can join
   * a run of its suit next, and the empty columns last — a whole run, or part of one only when no whole run can go there.
   */
  function moves(): SpiderMove[] {
    const ranked: { m: SpiderMove; p: number }[] = [];
    const empty = cols.findIndex((c) => c.length === 0);
    let wholeIntoEmpty = false;
    const intoEmpty: { m: SpiderMove; p: number }[] = [];
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      if (col.length === 0) continue;
      const s = runStart(i);
      const top = col.length - 1;
      // moving the whole run turns a card up or empties the column
      const opens = s === down[i]!;
      const under = s > 0 ? col[s - 1]! : null;
      const deeper = down[i]! * 0.01;
      for (let k = s; k <= top; k++) {
        const card = col[k]!;
        for (let j = 0; j < cols.length; j++) {
          if (j === i || cols[j]!.length === 0) continue;
          const target = cols[j]![cols[j]!.length - 1]!;
          if (spiderRank(target) !== spiderRank(card) + 1) continue;
          const sameSuit = suit(target) === suit(card);
          const m: SpiderMove = { kind: 'move', from: i, index: k, to: j };
          if (k === s) {
            if (sameSuit) ranked.push({ m, p: (opens ? 0 : 1) - deeper - runLength(j) * 0.001 });
            else if (opens) ranked.push({ m, p: 2 - deeper });
            // onto a card like the one it lies on: nothing changes that matters
            else if (under !== null && spiderRank(under) === spiderRank(card) + 1) continue;
            // off a card only so that this card can join a run of its suit next
            else if (under !== null && joinable(under, i, col[top]!, j)) ranked.push({ m, p: 5 });
          } else if (sameSuit && runLength(j) > k - s) {
            // part of a run onto a longer run of its suit: the runs grow towards a whole one
            ranked.push({ m, p: 3 - runLength(j) * 0.001 });
          }
        }
        // into an empty column (one is as good as another): not a whole column on its own
        if (empty >= 0 && !(k === 0 && down[i] === 0)) {
          const m: SpiderMove = { kind: 'move', from: i, index: k, to: empty };
          if (k === s) {
            wholeIntoEmpty = true;
            intoEmpty.push({ m, p: 6 - deeper });
          } else intoEmpty.push({ m, p: 7 });
        }
      }
    }
    for (const e of intoEmpty) if (e.p < 7 || !wholeIntoEmpty) ranked.push(e);
    if (dealt < stock.length && empty < 0) ranked.push({ m: { kind: 'deal' }, p: 4 });
    if (attempt > 0) {
      // a small shift, the same for the same move, position and attempt: ties go another way
      for (const r of ranked) r.p += (hashMove(r.m) % 97) * 0.000001;
    }
    return ranked.sort((a, b) => a.p - b.p).map((r) => r.m);
  }

  function hashMove(m: SpiderMove): number {
    const base = m.kind === 'deal' ? 7 : m.from * 1009 + m.index * 31 + m.to * 7 + 3;
    return (Math.imul(base ^ (attempt * 2654435761), 0x9e3779b1) ^ dealt) >>> 0;
  }

  // ---------- positions ----------
  /**
   * A position as a number (two 32-bit hashes in one): each column's faces and face-down count in order, the stock
   * dealt, the runs home. Cards alike (the same face) count as the same. Two positions with one number would make the
   * search skip one of them — it could miss a way, never claim a false one (a way is played out move by move).
   */
  function key(): number {
    let hi = (0x811c9dc5 ^ dealt) >>> 0;
    let lo = (0x01000193 ^ (home * 2654435761)) >>> 0;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      hi = Math.imul(hi ^ (down[i]! + 997 * (i + 1)), 0x01000193) >>> 0;
      lo = Math.imul(lo ^ (col.length + 131 * (i + 1)), 0x5bd1e995) >>> 0;
      for (let k = 0; k < col.length; k++) {
        const face = suit(col[k]!) * RANKS + spiderRank(col[k]!);
        hi = Math.imul(hi ^ face, 0x01000193) >>> 0;
        lo = Math.imul(lo ^ (face + 7), 0xc2b2ae35) >>> 0;
        lo ^= lo >>> 15;
      }
    }
    return hi * 0x200000 + (lo & 0x1fffff);
  }

  // ---------- the search ----------
  const frames: Frame[] = [{ moves: moves(), next: 0, done: null }];
  const first = frames[0]!.moves[0] ?? null;
  /** The moves on the way down to the frame on top, in order. */
  const made: SpiderMove[] = [];
  seen.add(key());
  if (home === RUNS) status = 'won';

  return {
    get steps() {
      return steps;
    },
    run(limit) {
      if (status !== 'more') return status;
      const stop = steps + limit;
      while (frames.length > 0) {
        const f = frames[frames.length - 1]!;
        if (f.next >= f.moves.length) {
          if (f.done) revert(f.done);
          made.pop();
          frames.pop();
          continue;
        }
        const m = f.moves[f.next++]!;
        const done = apply(m);
        if (home === RUNS) {
          way = [...made, m];
          status = 'won';
          return status;
        }
        const k = key();
        if (seen.has(k)) {
          revert(done);
          continue;
        }
        seen.add(k);
        steps += 1;
        made.push(m);
        frames.push({ moves: moves(), next: 0, done });
        if (steps >= stop) return 'more';
      }
      status = 'lost';
      return status;
    },
    path() {
      return way;
    },
    firstMove() {
      return first;
    },
  };
}
