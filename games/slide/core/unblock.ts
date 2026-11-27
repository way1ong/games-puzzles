// "Clear the way" (docs/slide/SPEC.md, "Звільни шлях"): a square frame with pieces of 2 or 3 cells, lying or
// standing. A piece moves only along itself, as far as the cells are free; the player's own piece (the first) leaves
// through the way out in the right side of the frame. A move is one piece slid any distance. Pure.
import { SLIDE } from '../config.ts';

export interface Piece {
  /** Lies (moves left and right) or stands (moves up and down). */
  across: boolean;
  /** The row of a lying piece, the column of a standing one. */
  line: number;
  length: number;
}

export interface Puzzle {
  size: number;
  /** The player's own piece is the first. */
  pieces: readonly Piece[];
}

/** Where each piece is along its line: the column of a lying piece's left end, the row of a standing one's top. */
export type Places = readonly number[];

export interface Move {
  piece: number;
  to: number;
}

/** The cells a piece covers at a place (row by row from the top left). */
export function cellsOf(piece: Piece, at: number, size: number): number[] {
  return Array.from({ length: piece.length }, (_, k) => (piece.across ? piece.line * size + at + k : (at + k) * size + piece.line));
}

/** Each cell: the piece on it plus one, or 0 when free. */
export function gridOf(puzzle: Puzzle, places: Places): Int8Array {
  const grid = new Int8Array(puzzle.size * puzzle.size);
  puzzle.pieces.forEach((p, i) => {
    for (const cell of cellsOf(p, places[i]!, puzzle.size)) grid[cell] = i + 1;
  });
  return grid;
}

/** How far a piece can go both ways from where it is: the least and the most place it can take. */
export function reachOf(puzzle: Puzzle, places: Places, piece: number, grid = gridOf(puzzle, places)): { least: number; most: number } {
  const p = puzzle.pieces[piece]!;
  const size = puzzle.size;
  const cell = (x: number) => (p.across ? p.line * size + x : x * size + p.line);
  const at = places[piece]!;
  let least = at;
  while (least > 0 && grid[cell(least - 1)] === 0) least--;
  let most = at;
  while (most + p.length < size && grid[cell(most + p.length)] === 0) most++;
  return { least, most };
}

/** Every move from these places: each piece to each place it can reach. */
export function movesOf(puzzle: Puzzle, places: Places): Move[] {
  const grid = gridOf(puzzle, places);
  const out: Move[] = [];
  puzzle.pieces.forEach((_, i) => {
    const { least, most } = reachOf(puzzle, places, i, grid);
    for (let to = least; to <= most; to++) if (to !== places[i]) out.push({ piece: i, to });
  });
  return out;
}

/** A move made; null when the piece cannot get there. */
export function slidePiece(puzzle: Puzzle, places: Places, move: Move): number[] | null {
  const { least, most } = reachOf(puzzle, places, move.piece);
  if (move.to === places[move.piece] || move.to < least || move.to > most) return null;
  const next = places.slice();
  next[move.piece] = move.to;
  return next;
}

/** The player's piece is at the way out. */
export function isOut(puzzle: Puzzle, places: Places): boolean {
  return places[0] === puzzle.size - puzzle.pieces[0]!.length;
}

/** One number for the places (each place is under the frame's size): the key of a position. */
export function keyOf(places: Places, size: number): number {
  let key = 0;
  for (let i = places.length - 1; i >= 0; i--) key = key * size + places[i]!;
  return key;
}

/** The places back from a key. */
export function placesOf(key: number, count: number, size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(key % size);
    key = Math.floor(key / size);
  }
  return out;
}

/**
 * A puzzle from text: the cells row by row, "." free, "A" the player's piece, other letters other pieces. The
 * player's piece must lie in the row of the way out; every piece is a straight line of 2 or 3 cells.
 */
export function parseBoard(text: string): { puzzle: Puzzle; places: number[] } {
  const size = Math.round(Math.sqrt(text.length));
  if (size * size !== text.length) throw new Error(`Not a square board: ${text}`);
  const letters = [...new Set(text.replaceAll('.', ''))].sort();
  if (letters[0] !== 'A') throw new Error(`No piece of the player: ${text}`);
  const pieces: Piece[] = [];
  const places: number[] = [];
  for (const letter of letters) {
    const cells = [...text].flatMap((ch, i) => (ch === letter ? [i] : []));
    const rows = new Set(cells.map((c) => Math.floor(c / size)));
    const across = rows.size === 1;
    const piece: Piece = { across, line: across ? Math.floor(cells[0]! / size) : cells[0]! % size, length: cells.length };
    const at = across ? cells[0]! % size : Math.floor(cells[0]! / size);
    if (!SLIDE.unblock.lengths.includes(piece.length as 2 | 3) || cellsOf(piece, at, size).join() !== cells.join()) {
      throw new Error(`Piece ${letter} is not a straight line of 2 or 3 cells: ${text}`);
    }
    pieces.push(piece);
    places.push(at);
  }
  const own = pieces[0]!;
  if (!own.across || own.line !== SLIDE.unblock.exitRow || own.length !== SLIDE.unblock.heroLength) throw new Error(`The player's piece is not in the row of the way out: ${text}`);
  return { puzzle: { size, pieces }, places };
}

/** The text of a board (the player's piece "A", the others "B", "C" … in their order). */
export function boardText(puzzle: Puzzle, places: Places): string {
  const cells = new Array<string>(puzzle.size * puzzle.size).fill('.');
  puzzle.pieces.forEach((p, i) => {
    for (const cell of cellsOf(p, places[i]!, puzzle.size)) cells[cell] = String.fromCharCode(65 + i);
  });
  return cells.join('');
}

/** The same board with its letters in reading order ("A" stays the player's): equal boards read the same. */
export function canonicalText(text: string): string {
  const names = new Map([
    ['A', 'A'],
    ['.', '.'],
  ]);
  let next = 66;
  return [...text]
    .map((ch) => {
      if (!names.has(ch)) names.set(ch, String.fromCharCode(next++));
      return names.get(ch)!;
    })
    .join('');
}
