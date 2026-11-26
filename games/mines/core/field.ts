// The field of Mines (docs/mines/SPEC.md, "Як грати"): its size, where the mines lie, the number each cell shows, and
// the first place. Cells are numbered row by row from the top left: cell = row × width + column. Pure.
import { nextInt } from '../../../shared/core/rng.ts';

export interface Size {
  width: number;
  height: number;
}

export interface Field extends Size {
  /** The cells with a mine, in order. */
  mines: readonly number[];
  /** The first place: it and its neighbours have no mine, so it opens a patch of the field. */
  start: number;
}

const tables = new Map<string, Int16Array[]>();

/** The neighbours of every cell (up to eight: above, below, the sides and the corners), kept for each size. */
export function neighbourTable(size: Size): readonly Int16Array[] {
  const key = `${size.width}x${size.height}`;
  let table = tables.get(key);
  if (!table) {
    table = [];
    for (let row = 0; row < size.height; row++) {
      for (let column = 0; column < size.width; column++) {
        const out: number[] = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = column + dc;
            if (r >= 0 && r < size.height && c >= 0 && c < size.width) out.push(r * size.width + c);
          }
        }
        table.push(Int16Array.from(out));
      }
    }
    tables.set(key, table);
  }
  return table;
}

export const cellCount = (size: Size): number => size.width * size.height;

/** For every cell: 1 — a mine. */
export function mineMap(field: Field): Uint8Array {
  const map = new Uint8Array(cellCount(field));
  for (const cell of field.mines) map[cell] = 1;
  return map;
}

/** For every cell: how many mines are among its neighbours. */
export function numbers(field: Field): Uint8Array {
  const map = mineMap(field);
  const table = neighbourTable(field);
  const out = new Uint8Array(map.length);
  for (let cell = 0; cell < map.length; cell++) {
    let n = 0;
    for (const other of table[cell]!) n += map[other]!;
    out[cell] = n;
  }
  return out;
}

/** The cell and its neighbours: where no mine may lie around the first place. */
export function startArea(size: Size, start: number): number[] {
  return [start, ...neighbourTable(size)[start]!];
}

/** A first place chosen from the seed, away from the edges, so that its patch has room (C). */
export function pickStart(size: Size, state: number): { start: number; state: number } {
  const row = nextInt(state, Math.max(1, size.height - 2));
  const column = nextInt(row.state, Math.max(1, size.width - 2));
  const r = size.height > 2 ? row.value + 1 : row.value;
  const c = size.width > 2 ? column.value + 1 : column.value;
  return { start: r * size.width + c, state: column.state };
}

/** `count` mines laid at random from the seed, none in the first place or next to it. */
export function layMines(size: Size, count: number, start: number, state: number): { field: Field; state: number } {
  const banned = new Set(startArea(size, start));
  const free: number[] = [];
  for (let cell = 0; cell < cellCount(size); cell++) if (!banned.has(cell)) free.push(cell);
  if (count > free.length) throw new Error(`${count} mines do not fit a ${size.width}×${size.height} field`);
  let s = state;
  // the first `count` places of a shuffle (Fisher–Yates, only as far as needed)
  for (let i = 0; i < count; i++) {
    const pick = nextInt(s, free.length - i);
    s = pick.state;
    const j = i + pick.value;
    [free[i], free[j]] = [free[j]!, free[i]!];
  }
  const mines = free.slice(0, count).sort((a, b) => a - b);
  return { field: { width: size.width, height: size.height, mines, start }, state: s };
}
