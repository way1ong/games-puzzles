// "The chest" (docs/slide/SPEC.md, "Скринька"): a frame of cells with a slot in the middle of its bottom side, as
// wide as the chest; on it the chest (the player's own, 2 × 2) and wooden blocks — small (1 × 1), lying (2 × 1) and
// standing (1 × 2). Every piece moves up, down, left or right as far as the cells are free; a move is one piece slid
// one or more cells in one straight direction (C). No piece goes beyond the frame; the chest is out as soon as it
// stands over the slot (C). Boards read and write as text, row by row: "." free, "A" the chest, other letters the
// blocks. Pure.
import { BOX_SHAPES, SLIDE, type BoxShape } from '../config.ts';
import { canonicalText } from './unblock.ts';

export interface BoxPuzzle {
  cols: number;
  rows: number;
  /** Each piece's shape; the chest is the first. */
  shapes: readonly BoxShape[];
}

/** Where each piece is: the cell of its top left corner, row by row from the top left. */
export type Spots = readonly number[];

export interface BoxMove {
  piece: number;
  /** The cell of the piece's top left corner after the move. */
  to: number;
}

/** The four ways a piece moves, as steps across and down. */
export const WAYS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] } as const;
export type Way = keyof typeof WAYS;
export const WAY_NAMES = Object.keys(WAYS) as Way[];

/** Cells across and down of a shape. */
export const sizeOf = (shape: BoxShape): readonly [number, number] => SLIDE.box.shapes[shape];

/** The cells a piece covers with its top left corner at `spot`. */
export function cellsOf(puzzle: BoxPuzzle, shape: BoxShape, spot: number): number[] {
  const [w, h] = sizeOf(shape);
  const out: number[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push(spot + dy * puzzle.cols + dx);
  return out;
}

/** Each cell: the piece on it plus one, or 0 when free. */
export function gridOf(puzzle: BoxPuzzle, spots: Spots): Int8Array {
  const grid = new Int8Array(puzzle.cols * puzzle.rows);
  puzzle.shapes.forEach((s, i) => {
    for (const cell of cellsOf(puzzle, s, spots[i]!)) grid[cell] = i + 1;
  });
  return grid;
}

/** How many cells a piece can go one way before a block or the frame. */
function reachWay(puzzle: BoxPuzzle, grid: Int8Array, shape: BoxShape, spot: number, way: Way): number {
  const { cols, rows } = puzzle;
  const [w, h] = sizeOf(shape);
  const [x, y] = [spot % cols, Math.floor(spot / cols)];
  const [sx, sy] = WAYS[way];
  for (let k = 1; ; k++) {
    // the column or row of cells the piece's leading side enters
    if (sx) {
      const col = sx < 0 ? x - k : x + w - 1 + k;
      if (col < 0 || col >= cols) return k - 1;
      for (let r = y; r < y + h; r++) if (grid[r * cols + col]) return k - 1;
    } else {
      const row = sy < 0 ? y - k : y + h - 1 + k;
      if (row < 0 || row >= rows) return k - 1;
      for (let c = x; c < x + w; c++) if (grid[row * cols + c]) return k - 1;
    }
  }
}

/** How many cells a piece can go each way from where it is. */
export function reachOf(puzzle: BoxPuzzle, spots: Spots, piece: number, grid = gridOf(puzzle, spots)): Record<Way, number> {
  const shape = puzzle.shapes[piece]!;
  const spot = spots[piece]!;
  return {
    left: reachWay(puzzle, grid, shape, spot, 'left'),
    right: reachWay(puzzle, grid, shape, spot, 'right'),
    up: reachWay(puzzle, grid, shape, spot, 'up'),
    down: reachWay(puzzle, grid, shape, spot, 'down'),
  };
}

/** The cell of a piece's top left corner `cells` away from `spot` one way. */
export const stepped = (puzzle: BoxPuzzle, spot: number, way: Way, cells: number): number => spot + cells * (WAYS[way][0] + WAYS[way][1] * puzzle.cols);

/** Every move from these spots: each piece, each way, each number of cells it can go. */
export function movesOf(puzzle: BoxPuzzle, spots: Spots): BoxMove[] {
  const grid = gridOf(puzzle, spots);
  const out: BoxMove[] = [];
  puzzle.shapes.forEach((_, i) => {
    const reach = reachOf(puzzle, spots, i, grid);
    for (const way of WAY_NAMES) for (let k = 1; k <= reach[way]; k++) out.push({ piece: i, to: stepped(puzzle, spots[i]!, way, k) });
  });
  return out;
}

/** The way and the number of cells of a move; null when it is not one straight way (or goes nowhere). */
export function wayOf(puzzle: BoxPuzzle, spots: Spots, move: BoxMove): { way: Way; cells: number } | null {
  const { cols, rows } = puzzle;
  const from = spots[move.piece];
  if (from === undefined || !Number.isInteger(move.to) || move.to < 0 || move.to >= cols * rows) return null;
  const dx = (move.to % cols) - (from % cols);
  const dy = Math.floor(move.to / cols) - Math.floor(from / cols);
  if ((dx === 0) === (dy === 0)) return null;
  const way: Way = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
  return { way, cells: Math.abs(dx) + Math.abs(dy) };
}

/** A move made; null when the piece cannot get there in one straight way. */
export function slideBlock(puzzle: BoxPuzzle, spots: Spots, move: BoxMove): number[] | null {
  const w = wayOf(puzzle, spots, move);
  if (!w || w.cells > reachOf(puzzle, spots, move.piece)[w.way]) return null;
  const next = spots.slice();
  next[move.piece] = move.to;
  return next;
}

/** Where the chest's top left corner is when it stands over the slot: in the bottom rows, the slot's columns. */
export function exitSpot(puzzle: BoxPuzzle): number {
  return (puzzle.rows - sizeOf('chest')[1]) * puzzle.cols + SLIDE.box.slot;
}

/** The chest stands over the slot: it is out. */
export function isOut(puzzle: BoxPuzzle, spots: Spots): boolean {
  return spots[0] === exitSpot(puzzle);
}

// ---------- a position as one number ----------

/**
 * A position as one number: every cell gives a digit — 0 free, 1 under a piece but not its top left corner, 2 and
 * up at a piece's top left corner (by its shape) — times the base to the power of the cell. Alike blocks are not told
 * apart, so positions that differ only by which of two alike blocks is where are one (they need the same moves). A
 * piece adds its footprint to the key, so a move changes the key by two numbers. With the slot in the middle, a
 * position and its mirror image need the same moves too: their key is the smaller of the two.
 */
const BASE = BOX_SHAPES.length + 2;
const SHAPE_INDEX = Object.fromEntries(BOX_SHAPES.map((s, i) => [s, i])) as Record<BoxShape, number>;

/** The slot is in the middle: a board and its mirror image (left and right swapped) are one puzzle. */
export const mirrorsAlike = (): boolean => 2 * SLIDE.box.slot + sizeOf('chest')[0] === SLIDE.box.cols;

export interface KeyTable {
  /** Each shape's footprint at each top left cell (NaN where it does not fit). */
  footprint: Float64Array[];
  /** The footprint of the same piece seen in a mirror. */
  mirror: Float64Array[];
}

const tables = new Map<number, KeyTable>();

/** The numbers the keys of a board of this size are made of. */
export function keyTable(cols: number, rows: number): KeyTable {
  const id = cols * 1000 + rows;
  let table = tables.get(id);
  if (table) return table;
  if (BASE ** (cols * rows) > Number.MAX_SAFE_INTEGER) throw new Error(`A board of ${cols} × ${rows} has too many cells for a key`);
  const power = Array.from({ length: cols * rows }, (_, cell) => BASE ** cell);
  const footprint = BOX_SHAPES.map((shape, i) => {
    const [w, h] = sizeOf(shape);
    return Float64Array.from({ length: cols * rows }, (_, cell) => {
      const [x, y] = [cell % cols, Math.floor(cell / cols)];
      if (x + w > cols || y + h > rows) return NaN;
      let sum = 0;
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) sum += (dx || dy ? 1 : 2 + i) * power[cell + dy * cols + dx]!;
      return sum;
    });
  });
  const mirror = BOX_SHAPES.map((shape, i) => {
    const w = sizeOf(shape)[0];
    return Float64Array.from({ length: cols * rows }, (_, cell) => {
      const [x, y] = [cell % cols, Math.floor(cell / cols)];
      return x + w > cols ? NaN : footprint[i]![y * cols + cols - w - x]!;
    });
  });
  table = { footprint, mirror };
  tables.set(id, table);
  return table;
}

export const shapeIndex = (shape: BoxShape): number => SHAPE_INDEX[shape];

/** The key of a position and of its mirror image: one number for both when the slot is in the middle. */
export const pairKey = (own: number, mirrored: number): number => (mirrorsAlike() && mirrored < own ? mirrored : own);

export function keyOf(puzzle: BoxPuzzle, spots: Spots): number {
  const { footprint, mirror } = keyTable(puzzle.cols, puzzle.rows);
  let own = 0;
  let mirrored = 0;
  puzzle.shapes.forEach((s, i) => {
    own += footprint[SHAPE_INDEX[s]]![spots[i]!]!;
    mirrored += mirror[SHAPE_INDEX[s]]![spots[i]!]!;
  });
  return pairKey(own, mirrored);
}

/** The cells' digits of a key (see above): `digits` gets them, cell by cell. */
export function digitsOf(key: number, digits: Uint8Array): void {
  for (let cell = 0; cell < digits.length; cell++) {
    const d = key % BASE;
    digits[cell] = d;
    key = (key - d) / BASE;
  }
}

/** The shape of the piece whose top left corner has this digit; null for a free cell or the rest of a piece. */
export const shapeOfDigit = (digit: number): BoxShape | null => (digit >= 2 ? BOX_SHAPES[digit - 2]! : null);

/** The text of a key's position: "A" the chest, the blocks "B", "C" … in reading order. */
export function textOfKey(key: number, cols: number, rows: number): string {
  const digits = new Uint8Array(cols * rows);
  digitsOf(key, digits);
  const cells = new Array<string>(cols * rows).fill('.');
  let next = 66;
  digits.forEach((digit, cell) => {
    const shape = shapeOfDigit(digit);
    if (!shape) return;
    const letter = shape === 'chest' ? 'A' : String.fromCharCode(next++);
    const [w, h] = sizeOf(shape);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells[cell + dy * cols + dx] = letter;
  });
  return cells.join('');
}

// ---------- boards as text ----------

/**
 * A puzzle from text: the cells row by row, "." free, "A" the chest (a square of 2 × 2), other letters blocks of
 * 1 × 1, 2 × 1 or 1 × 2. The pieces are in the order of their letters.
 */
export function parseBox(text: string): { puzzle: BoxPuzzle; spots: number[] } {
  const { cols, rows } = SLIDE.box;
  if (text.length !== cols * rows || /[^.A-Z]/.test(text)) throw new Error(`Not a board of ${cols} × ${rows}: ${text}`);
  const letters = [...new Set(text.replaceAll('.', ''))].sort();
  if (letters[0] !== 'A') throw new Error(`No chest: ${text}`);
  const shapes: BoxShape[] = [];
  const spots: number[] = [];
  const puzzle: BoxPuzzle = { cols, rows, shapes };
  for (const letter of letters) {
    const cells = [...text].flatMap((ch, i) => (ch === letter ? [i] : []));
    const spot = cells[0]!;
    const [x, y] = [spot % cols, Math.floor(spot / cols)];
    const shape = letter === 'A' ? 'chest' : BOX_SHAPES.find((s) => s !== 'chest' && sizeOf(s)[0] * sizeOf(s)[1] === cells.length && cellsOf(puzzle, s, spot).join() === cells.join());
    const [w, h] = shape ? sizeOf(shape) : [0, 0];
    if (!shape || x + w > cols || y + h > rows || cellsOf(puzzle, shape, spot).join() !== cells.join()) {
      throw new Error(`Piece ${letter} is not ${letter === 'A' ? 'a chest' : 'a block'}: ${text}`);
    }
    shapes.push(shape);
    spots.push(spot);
  }
  return { puzzle, spots };
}

/** The text of a board ("A" the chest, the blocks "B", "C" … in their order). */
export function boxText(puzzle: BoxPuzzle, spots: Spots): string {
  const cells = new Array<string>(puzzle.cols * puzzle.rows).fill('.');
  puzzle.shapes.forEach((s, i) => {
    for (const cell of cellsOf(puzzle, s, spots[i]!)) cells[cell] = String.fromCharCode(65 + i);
  });
  return cells.join('');
}

/** The board seen in a mirror (left and right swapped), its letters in reading order. */
export function mirrorText(text: string, cols = SLIDE.box.cols): string {
  const rows: string[] = [];
  for (let i = 0; i < text.length; i += cols) rows.push([...text.slice(i, i + cols)].reverse().join(''));
  return canonicalText(rows.join(''));
}

/** One text for a board and its mirror image (when the slot is in the middle): the first of the two in order. */
export function plainText(text: string): string {
  const mirror = mirrorsAlike() ? mirrorText(text) : text;
  const own = canonicalText(text);
  return mirror < own ? mirror : own;
}
