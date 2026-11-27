// Bottles and pours (docs/pour/SPEC.md, "Як грати"). A bottle holds layers of water, bottom first; a colour is a
// number. Water pours onto the same colour or into an empty bottle: all the top layers of that colour, as many as
// fit. The bottles are solved when each is empty or full of one colour. Pure: nothing here changes its arguments.

export type Colour = number;
export type Bottle = readonly Colour[];
export type Bottles = readonly Bottle[];

export interface Move {
  from: number;
  to: number;
}

/** The top colour; null for an empty bottle. */
export function topColour(bottle: Bottle): Colour | null {
  return bottle.length ? bottle[bottle.length - 1]! : null;
}

/** How many layers of the top colour lie together at the top. */
export function topRun(bottle: Bottle): number {
  const top = topColour(bottle);
  let n = 0;
  for (let i = bottle.length - 1; i >= 0 && bottle[i] === top; i--) n++;
  return n;
}

/** Full of one colour: such a bottle is done ("closed"). */
export function isClosed(bottle: Bottle, capacity: number): boolean {
  return bottle.length === capacity && topRun(bottle) === capacity;
}

export function isSolved(bottles: Bottles, capacity: number): boolean {
  return bottles.every((b) => b.length === 0 || isClosed(b, capacity));
}

/** Why water cannot go from one bottle into another; null when it can. */
export type NoPour = 'same' | 'empty' | 'closed' | 'full' | 'colour';

export function whyNot(bottles: Bottles, move: Move, capacity: number): NoPour | null {
  const a = bottles[move.from]!;
  const b = bottles[move.to]!;
  if (move.from === move.to) return 'same';
  if (!a.length) return 'empty';
  if (isClosed(a, capacity)) return 'closed';
  if (b.length >= capacity) return 'full';
  if (b.length && topColour(b) !== topColour(a)) return 'colour';
  return null;
}

/** Layers that a pour moves (0 when it cannot be made). */
export function pourAmount(bottles: Bottles, move: Move, capacity: number): number {
  if (whyNot(bottles, move, capacity) !== null) return 0;
  return Math.min(topRun(bottles[move.from]!), capacity - bottles[move.to]!.length);
}

/** The bottles after a pour; the same bottles when it cannot be made. */
export function pour(bottles: Bottles, move: Move, capacity: number): Bottles {
  const n = pourAmount(bottles, move, capacity);
  if (!n) return bottles;
  const from = bottles[move.from]!;
  const colour = topColour(from)!;
  return bottles.map((b, i) => {
    if (i === move.from) return from.slice(0, from.length - n);
    if (i === move.to) return [...b, ...Array<Colour>(n).fill(colour)];
    return b;
  });
}

/** Every pour that can be made. */
export function legalMoves(bottles: Bottles, capacity: number): Move[] {
  const out: Move[] = [];
  for (let from = 0; from < bottles.length; from++) {
    for (let to = 0; to < bottles.length; to++) {
      if (whyNot(bottles, { from, to }, capacity) === null) out.push({ from, to });
    }
  }
  return out;
}

/**
 * The pours worth looking at when searching: no bottle of one colour emptied into an empty one (it only changes
 * places), and of the empty bottles only the first (they are all alike).
 */
export function usefulMoves(bottles: Bottles, capacity: number): Move[] {
  const out: Move[] = [];
  const firstEmpty = bottles.findIndex((b) => b.length === 0);
  for (let from = 0; from < bottles.length; from++) {
    const a = bottles[from]!;
    if (!a.length || isClosed(a, capacity)) continue;
    const oneColour = topRun(a) === a.length;
    for (let to = 0; to < bottles.length; to++) {
      if (to === from) continue;
      const b = bottles[to]!;
      if (b.length === 0) {
        if (to === firstEmpty && !oneColour) out.push({ from, to });
      } else if (b.length < capacity && topColour(b) === topColour(a)) out.push({ from, to });
    }
  }
  return out;
}

/** The same position whichever bottle stands where: the bottles' contents, sorted. */
export function keyOf(bottles: Bottles): string {
  return bottles
    .map((b) => b.join(','))
    .sort()
    .join('|');
}

/** Every colour with as many layers as a bottle holds, nothing else (a check of a deal or a saved game). */
export function isWhole(bottles: Bottles, colours: number, capacity: number): boolean {
  const count = new Array<number>(colours).fill(0);
  for (const b of bottles) {
    if (b.length > capacity) return false;
    for (const c of b) {
      if (!Number.isInteger(c) || c < 0 || c >= colours) return false;
      count[c]!++;
    }
  }
  return count.every((n) => n === capacity);
}
