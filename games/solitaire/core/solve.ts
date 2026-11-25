// The solver (docs/solitaire/SPEC.md, "Роздачі", "Підказка"): looks for a way to put every card home, knowing all
// the cards, the face-down ones too. Depth first, with a memory of positions already seen, and in slices: `run(steps)`
// goes on from where it stopped, so the screen keeps working in between. A move from the stock is taken whole —
// "turn the stock until this card is on top, then put it there": the turns change nothing else. Cards that no other
// card can need any more go home at once (safe moves), which keeps the search short. Pure, no DOM.
import type { Draw } from '../config.ts';
import { DECK, KING, isRed, rankOf, suitOf, type Card } from './cards.ts';
import type { Table } from './klondike.ts';

/** Where a card goes: a column (0…), or home (FOUNDATION). */
export const FOUNDATION = -1;

/**
 * A move of the solver. From the stock: `p` is the size of the waste when the card is on its top (the card is
 * talon[p − 1]). From a column: the cards from `index` up.
 */
export type SolverMove = { kind: 'talon'; p: number; to: number } | { kind: 'column'; from: number; index: number; to: number };

export type SolveStatus = 'won' | 'lost' | 'more';

export interface Solver {
  /** Goes on for at most `steps` more positions; 'more' — not decided yet. */
  run(steps: number): SolveStatus;
  /** After 'won': the way, the first move first (with the safe moves taken on the way). */
  path(): SolverMove[];
  /** The move the search tries first from the starting position (a safe move home, if there is one); null — none. */
  firstMove(): SolverMove | null;
  /** Positions looked at so far. */
  readonly steps: number;
}

/** A move done, with what is needed to take it back. */
type Done =
  | { kind: 'talon'; p: number; at: number; pos: number; card: Card; to: number }
  | { kind: 'column'; from: number; index: number; count: number; to: number; flipped: boolean; card: Card };

interface Frame {
  moves: SolverMove[];
  next: number;
  /** The move that led here and the safe moves after it (taken back when the frame is left). */
  done: Done[];
}

export function createSolver(table: Table, draw: Draw): Solver {
  const cols = table.columns.map((c) => [...c]);
  const down = [...table.down];
  const talon = [...table.talon];
  let pos = table.pos;
  const found = [...table.foundations];
  let home = found.reduce((a, b) => a + b, 0);
  const seen = new Set<number>();
  let steps = 0;
  let status: SolveStatus = 'more';
  let way: SolverMove[] = [];

  // ---------- doing and undoing ----------
  const fitsHome = (card: Card) => found[suitOf(card)] === rankOf(card) - 1;
  const fitsOn = (card: Card, under: Card) => rankOf(under) === rankOf(card) + 1 && isRed(under) !== isRed(card);
  const columnTakes = (card: Card, to: number) => {
    const col = cols[to]!;
    return col.length === 0 ? rankOf(card) === KING : fitsOn(card, col[col.length - 1]!);
  };

  function place(card: Card, to: number): void {
    if (to === FOUNDATION) {
      found[suitOf(card)]! += 1;
      home += 1;
    } else cols[to]!.push(card);
  }

  function apply(m: SolverMove): Done {
    if (m.kind === 'talon') {
      const card = talon[m.p - 1]!;
      const done: Done = { kind: 'talon', p: m.p, at: m.p - 1, pos, card, to: m.to };
      talon.splice(m.p - 1, 1);
      pos = m.p - 1;
      place(card, m.to);
      return done;
    }
    const col = cols[m.from]!;
    const cards = col.splice(m.index);
    for (const card of cards) place(card, m.to);
    let flipped = false;
    if (col.length > 0 && down[m.from] === col.length) {
      down[m.from]! -= 1;
      flipped = true;
    }
    return { kind: 'column', from: m.from, index: m.index, count: cards.length, to: m.to, flipped, card: cards[0]! };
  }

  function revert(d: Done): void {
    if (d.kind === 'talon') {
      if (d.to === FOUNDATION) {
        found[suitOf(d.card)]! -= 1;
        home -= 1;
      } else cols[d.to]!.pop();
      talon.splice(d.at, 0, d.card);
      pos = d.pos;
      return;
    }
    if (d.flipped) down[d.from]! += 1;
    if (d.to === FOUNDATION) {
      // a column sends one card home at a time
      found[suitOf(d.card)]! -= 1;
      home -= 1;
      cols[d.from]!.push(d.card);
      return;
    }
    const moved = cols[d.to]!.splice(-d.count);
    cols[d.from]!.push(...moved);
  }

  /** A card no other card can need any more: aces and twos, or both cards of the other colour one rank lower are home. */
  function safeHome(card: Card): boolean {
    const rank = rankOf(card);
    if (rank <= 2) return true;
    const red = isRed(card);
    for (let s = 0; s < found.length; s++) if ((s % 2 === 1) !== red && found[s]! < rank - 1) return false;
    return true;
  }

  /** Takes the safe moves home, as long as there are some; returns them. */
  function safeMoves(): Done[] {
    const done: Done[] = [];
    for (let again = true; again; ) {
      again = false;
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]!;
        const top = col[col.length - 1];
        if (top !== undefined && col.length > down[i]! && fitsHome(top) && safeHome(top)) {
          done.push(apply({ kind: 'column', from: i, index: col.length - 1, to: FOUNDATION }));
          again = true;
        }
      }
      if (pos > 0) {
        const top = talon[pos - 1]!;
        if (fitsHome(top) && safeHome(top)) {
          done.push(apply({ kind: 'talon', p: pos, to: FOUNDATION }));
          again = true;
        }
      }
    }
    return done;
  }

  // ---------- the end ----------
  /** Whether the rest goes home by itself: nothing face down, and (one card a turn) every stock card can be reached. */
  function wonFromHere(): boolean {
    if (home === DECK) return true;
    if (down.some((d) => d > 0)) return false;
    if (draw === 1 || talon.length === 0) return true;
    // three a turn: try finishing on a copy
    const c = cols.map((x) => [...x]);
    const t = [...talon];
    const f = [...found];
    let p = pos;
    let h = home;
    for (let guard = 0; guard < DECK * (t.length + 3) && h < DECK; guard++) {
      let moved = false;
      for (const col of c) {
        const top = col[col.length - 1];
        if (top !== undefined && f[suitOf(top)] === rankOf(top) - 1) {
          col.pop();
          f[suitOf(top)]! += 1;
          h += 1;
          moved = true;
        }
      }
      if (p > 0 && f[suitOf(t[p - 1]!)] === rankOf(t[p - 1]!) - 1) {
        const top = t.splice(p - 1, 1)[0]!;
        p -= 1;
        f[suitOf(top)]! += 1;
        h += 1;
        moved = true;
      }
      if (!moved) {
        if (t.length === 0) break;
        p = p < t.length ? Math.min(p + draw, t.length) : 0;
      }
    }
    return h === DECK;
  }

  // ---------- moves ----------
  /**
   * Sizes of the waste at which a stock card is on top and can be played — every one with one card a turn — in the
   * order the turns bring them: the nearest first, so that a hint leads to the card the player will see soonest.
   */
  function reachable(): number[] {
    const len = talon.length;
    if (len === 0) return [];
    if (draw === 1) {
      const out: number[] = [];
      if (pos > 0) out.push(pos);
      for (let p = pos + 1; p <= len; p++) out.push(p);
      for (let p = 1; p < pos; p++) out.push(p);
      return out;
    }
    const set = new Set<number>();
    if (pos > 0) set.add(pos);
    for (let p = pos + draw; p < len; p += draw) set.add(p);
    set.add(len);
    for (let p = draw; p < len; p += draw) set.add(p);
    return [...set];
  }

  /** A king waiting for an empty column: in the stock, or in a column with cards under it. */
  function kingWaits(): boolean {
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      for (let k = Math.max(1, down[i]!); k < col.length; k++) if (rankOf(col[k]!) === KING) return true;
      if (down[i]! > 0 && col.length > down[i]! && rankOf(col[down[i]!]!) === KING) return true;
    }
    return talon.some((c) => rankOf(c) === KING);
  }

  function moves(): SolverMove[] {
    const out: SolverMove[] = [];
    const empty = cols.findIndex((c) => c.length === 0);
    const targets = (card: Card, from: number): number[] => {
      const list: number[] = [];
      for (let to = 0; to < cols.length; to++) {
        if (to === from || cols[to]!.length === 0) continue;
        if (columnTakes(card, to)) list.push(to);
      }
      if (empty >= 0 && empty !== from && rankOf(card) === KING) list.push(empty);
      return list;
    };
    // 1. column tops home
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      const top = col[col.length - 1];
      if (top !== undefined && col.length > down[i]! && fitsHome(top)) out.push({ kind: 'column', from: i, index: col.length - 1, to: FOUNDATION });
    }
    const reach = reachable();
    // 2. stock cards home
    for (const p of reach) if (fitsHome(talon[p - 1]!)) out.push({ kind: 'talon', p, to: FOUNDATION });
    // 3. runs that turn a face-down card, from the columns with the most face-down cards first
    const order = cols.map((_, i) => i).sort((a, b) => down[b]! - down[a]!);
    for (const i of order) {
      const col = cols[i]!;
      if (down[i]! === 0 || col.length <= down[i]!) continue;
      for (const to of targets(col[down[i]!]!, i)) out.push({ kind: 'column', from: i, index: down[i]!, to });
    }
    // 4. stock cards to columns
    for (const p of reach) for (const to of targets(talon[p - 1]!, -1)) out.push({ kind: 'talon', p, to });
    // 5. a whole column moved (it empties) — only if a king waits for the room
    if (kingWaits()) {
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]!;
        if (down[i]! !== 0 || col.length === 0 || rankOf(col[0]!) === KING) continue;
        for (const to of targets(col[0]!, i)) if (cols[to]!.length > 0) out.push({ kind: 'column', from: i, index: 0, to });
      }
    }
    // 6. part of a run moved, so that the card it uncovers can go home
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      for (let k = down[i]! + 1; k < col.length; k++) {
        if (!fitsHome(col[k - 1]!)) continue;
        for (const to of targets(col[k]!, i)) if (cols[to]!.length > 0) out.push({ kind: 'column', from: i, index: k, to });
      }
    }
    return out;
  }

  // ---------- positions ----------
  /**
   * A position as a number (two 32-bit FNV hashes in one): the columns in any order (they are alike), the stock and,
   * with three cards a turn, the waste's size. Two positions with one number would make the search skip one of them —
   * it could miss a way, never claim a false one (every way is played out move by move).
   */
  const colHash = new Uint32Array(cols.length * 2);
  function key(): number {
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      let a = (0x811c9dc5 ^ down[i]!) >>> 0;
      let b = (0x01000193 ^ (down[i]! * 2654435761)) >>> 0;
      for (let k = 0; k < col.length; k++) {
        a = Math.imul(a ^ (col[k]! + 1), 0x01000193) >>> 0;
        b = Math.imul(b ^ (col[k]! + 7), 0x5bd1e995) >>> 0;
        b ^= b >>> 15;
      }
      colHash[i * 2] = a;
      colHash[i * 2 + 1] = b;
    }
    // the columns in any order: their hashes are summed after mixing, so the order does not count
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < cols.length; i++) {
      hi = (hi + Math.imul(colHash[i * 2]! ^ (colHash[i * 2]! >>> 13), 0x9e3779b1)) >>> 0;
      lo = (lo + Math.imul(colHash[i * 2 + 1]! ^ (colHash[i * 2 + 1]! >>> 16), 0x85ebca6b)) >>> 0;
    }
    for (let k = 0; k < talon.length; k++) {
      hi = Math.imul(hi ^ (talon[k]! + 101), 0x01000193) >>> 0;
      lo = Math.imul(lo ^ (talon[k]! + 211), 0xc2b2ae35) >>> 0;
    }
    if (draw !== 1) hi = Math.imul(hi ^ (pos + 997), 0x27d4eb2d) >>> 0;
    return hi * 0x200000 + (lo & 0x1fffff);
  }

  // ---------- the search ----------
  const asMove = (d: Done): SolverMove =>
    d.kind === 'talon' ? { kind: 'talon', p: d.p, to: d.to } : { kind: 'column', from: d.from, index: d.index, to: d.to };
  const rootDone = safeMoves();
  const frames: Frame[] = [{ moves: moves(), next: 0, done: rootDone }];
  const firstDone = rootDone[0];
  const firstMove: SolverMove | null = firstDone
    ? firstDone.kind === 'talon'
      ? { kind: 'talon', p: firstDone.p, to: firstDone.to }
      : { kind: 'column', from: firstDone.from, index: firstDone.index, to: firstDone.to }
    : (frames[0]!.moves[0] ?? null);
  seen.add(key());
  if (wonFromHere()) {
    status = 'won';
    // the safe moves taken at the start are the way (they may turn up the last face-down card)
    way = rootDone.map(asMove);
  }


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
          for (let k = f.done.length - 1; k >= 0; k--) revert(f.done[k]!);
          frames.pop();
          continue;
        }
        const m = f.moves[f.next++]!;
        const done = [apply(m), ...safeMoves()];
        if (wonFromHere()) {
          way = frames.flatMap((x) => x.done.map(asMove)).concat(done.map(asMove));
          status = 'won';
          return status;
        }
        const k = key();
        if (seen.has(k)) {
          for (let j = done.length - 1; j >= 0; j--) revert(done[j]!);
          continue;
        }
        seen.add(k);
        steps += 1;
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
      return firstMove;
    },
  };
}
