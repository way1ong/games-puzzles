// The layouts: own shapes the tiles are stacked in (docs/pairs/SPEC.md, "Розклади й рівні"), not taken from any
// other game. A layer is drawn row by row: '#' is a tile, '.' none. A tile takes 2 × 2 half-tile units; the
// layer is moved by dx, dy half tiles, so an upper tile can lie across two or four tiles below. Every layout
// fits PAIRS.max (whole tiles across and down, layers) and holds an even number of tiles — the tests check it.

export interface LayerDef {
  /** Shift of the layer, in half tiles. */
  dx: number;
  dy: number;
  rows: readonly string[];
}

/** A place on the table: x, y in half tiles from the top left, z — the layer (0 — on the table). */
export interface Slot {
  x: number;
  y: number;
  z: number;
}

const grid = (columns: number, rows: number): string[] => Array.from({ length: rows }, () => '#'.repeat(columns));

export const LAYOUTS = {
  // ---------- small: 16–24 tiles ----------
  cross: [
    { dx: 0, dy: 0, rows: ['.##.', '####', '####', '.##.'] },
    { dx: 2, dy: 2, rows: ['##', '##'] },
  ],
  hills: [
    { dx: 0, dy: 0, rows: ['##.##', '##.##', '##.##'] },
    { dx: 1, dy: 1, rows: ['#..#', '#..#'] },
    { dx: 1, dy: 2, rows: ['#..#'] },
  ],
  square: [
    { dx: 0, dy: 0, rows: grid(4, 4) },
    { dx: 2, dy: 2, rows: grid(2, 2) },
  ],
  frame: [
    { dx: 0, dy: 0, rows: ['#####', '#...#', '#...#', '#####'] },
    { dx: 0, dy: 0, rows: ['#...#', '.....', '.....', '#...#'] },
    { dx: 0, dy: 0, rows: ['#...#', '.....', '.....', '#...#'] },
  ],
  bridge: [
    { dx: 0, dy: 0, rows: ['######', '#....#', '######'] },
    { dx: 2, dy: 0, rows: ['####', '....', '####'] },
  ],
  // ---------- medium: 28–40 tiles ----------
  steps: [
    { dx: 0, dy: 0, rows: grid(5, 4) },
    { dx: 1, dy: 1, rows: grid(4, 3) },
  ],
  gate: [
    { dx: 0, dy: 0, rows: ['######', '######', '##..##', '##..##'] },
    { dx: 0, dy: 0, rows: ['######', '......', '##..##'] },
  ],
  pyramid: [
    { dx: 0, dy: 0, rows: grid(6, 4) },
    { dx: 2, dy: 2, rows: grid(4, 2) },
    { dx: 4, dy: 3, rows: grid(2, 1) },
  ],
  flower: [
    { dx: 0, dy: 0, rows: ['.####.', '######', '######', '######', '.####.'] },
    { dx: 2, dy: 2, rows: grid(4, 3) },
  ],
  rings: [
    { dx: 0, dy: 0, rows: ['######', '#....#', '#....#', '#....#', '#....#', '######'] },
    { dx: 0, dy: 0, rows: ['######', '#....#', '......', '......', '#....#', '######'] },
  ],
  // ---------- large: 44–56 tiles ----------
  diamond: [
    { dx: 0, dy: 0, rows: ['..##..', '.####.', '######', '######', '.####.', '..##..'] },
    { dx: 2, dy: 2, rows: ['.##.', '####', '####', '.##.'] },
    { dx: 3, dy: 4, rows: grid(3, 2) },
    { dx: 4, dy: 5, rows: grid(2, 1) },
  ],
  terrace: [
    { dx: 0, dy: 0, rows: grid(6, 5) },
    { dx: 1, dy: 1, rows: grid(5, 4) },
  ],
  castle: [
    { dx: 0, dy: 0, rows: grid(6, 6) },
    { dx: 0, dy: 0, rows: ['##..##', '##..##', '......', '......', '##..##', '##..##'] },
  ],
  tower: [
    { dx: 0, dy: 0, rows: grid(6, 6) },
    { dx: 2, dy: 2, rows: grid(4, 4) },
    { dx: 4, dy: 4, rows: grid(2, 2) },
  ],
  // ---------- the biggest: 60 tiles and more ----------
  ziggurat: [
    { dx: 0, dy: 0, rows: grid(6, 5) },
    { dx: 1, dy: 1, rows: grid(5, 4) },
    { dx: 2, dy: 2, rows: grid(4, 3) },
  ],
  mountain: [
    { dx: 0, dy: 0, rows: grid(6, 6) },
    { dx: 1, dy: 1, rows: grid(5, 5) },
    { dx: 2, dy: 2, rows: grid(4, 4) },
    { dx: 3, dy: 3, rows: grid(3, 3) },
  ],
  citadel: [
    { dx: 0, dy: 0, rows: grid(6, 6) },
    { dx: 0, dy: 0, rows: ['######', '#....#', '#.##.#', '#.##.#', '#....#', '######'] },
    { dx: 4, dy: 4, rows: grid(2, 2) },
  ],
} satisfies Record<string, readonly LayerDef[]>;

export type LayoutName = keyof typeof LAYOUTS;

export function isLayoutName(name: string): name is LayoutName {
  return Object.hasOwn(LAYOUTS, name);
}

/** The places of a layout, layer by layer from the table up, each layer row by row. */
export function slotsOf(layers: readonly LayerDef[]): Slot[] {
  const slots: Slot[] = [];
  layers.forEach((layer, z) =>
    layer.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === '#') slots.push({ x: 2 * c + layer.dx, y: 2 * r + layer.dy, z });
    }),
  );
  return slots;
}
