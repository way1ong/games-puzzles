// Ways to fill the free cells of a Word Field with words: every path of free cells that spells a word the game
// accepts (found through a tree of the words' tiles), and a search for paths that cover the free cells exactly
// once. Used when the player places another real word (can the rest still be filled?) and for the hints after
// that. Pure, no DOM.
import { WORDS } from '../config.ts';
import type { Dictionary } from './dictionary.ts';
import { neighbours, type Field, type FieldWord } from './field.ts';

interface Node {
  next: Map<string, Node>;
  word: string | null;
  /** A crossword (common) word: tried first, so a fill reads like the hidden ones. */
  common: boolean;
}

export interface Solver {
  /** Every path of free cells that spells an accepted word (common words first). */
  paths(free: readonly boolean[]): FieldWord[];
  /** Paths of free cells that spell exactly these tiles. */
  find(free: readonly boolean[], tiles: readonly string[]): number[][];
  /** A way to fill the free cells with words: null — there is none; 'unknown' — the search gave up. */
  complete(free: readonly boolean[], steps?: number): FieldWord[] | null | 'unknown';
}

export function makeSolver(dict: Dictionary, field: Field): Solver {
  const { cols, rows, cells } = field;
  const near = cells.map((_, i) => neighbours(cols, rows, i));
  // Only words made of tiles the field has: a small tree.
  const have = new Set(cells);
  const commons = new Set(dict.answers.map((w) => w.text));
  const root: Node = { next: new Map(), word: null, common: false };
  for (const w of dict.all) {
    if (w.tiles.length > cells.length || !w.tiles.every((t) => have.has(t))) continue;
    let node = root;
    for (const t of w.tiles) {
      let n = node.next.get(t);
      if (!n) node.next.set(t, (n = { next: new Map(), word: null, common: false }));
      node = n;
    }
    node.word = w.text;
    node.common = commons.has(w.text);
  }

  function paths(free: readonly boolean[]): FieldWord[] {
    const common: FieldWord[] = [];
    const rare: FieldWord[] = [];
    const path: number[] = [];
    const inPath = new Array<boolean>(cells.length).fill(false);
    const walk = (cell: number, node: Node) => {
      path.push(cell);
      inPath[cell] = true;
      if (node.word && path.length >= WORDS.minWord) (node.common ? common : rare).push({ text: node.word, path: [...path] });
      for (const n of near[cell]!) {
        if (!free[n] || inPath[n]) continue;
        const next = node.next.get(cells[n]!);
        if (next) walk(n, next);
      }
      inPath[cell] = false;
      path.pop();
    };
    for (let c = 0; c < cells.length; c++) {
      if (!free[c]) continue;
      const node = root.next.get(cells[c]!);
      if (node) walk(c, node);
    }
    return [...common, ...rare];
  }

  function find(free: readonly boolean[], tiles: readonly string[]): number[][] {
    const out: number[][] = [];
    const path: number[] = [];
    const walk = (cell: number) => {
      path.push(cell);
      if (path.length === tiles.length) out.push([...path]);
      else for (const n of near[cell]!) if (free[n] && !path.includes(n) && cells[n] === tiles[path.length]) walk(n);
      path.pop();
    };
    if (tiles.length) for (let c = 0; c < cells.length; c++) if (free[c] && cells[c] === tiles[0]) walk(c);
    return out;
  }

  function complete(free: readonly boolean[], steps: number = WORDS.field.solveSteps): FieldWord[] | null | 'unknown' {
    const open = [...free];
    const all = paths(open);
    const through: FieldWord[][] = cells.map(() => []);
    for (const p of all) for (const c of p.path) through[c]!.push(p);
    const usable = (p: FieldWord) => p.path.every((c) => open[c]);
    const chosen: FieldWord[] = [];
    let left = steps;
    // Exact cover: the free cell with the fewest words through it first; its words in turn.
    const search = (): boolean | 'stop' => {
      let best = -1;
      let fewest = Infinity;
      for (let c = 0; c < cells.length; c++) {
        if (!open[c]) continue;
        let count = 0;
        for (const p of through[c]!) if (usable(p)) count++;
        if (count < fewest) {
          best = c;
          fewest = count;
          if (count === 0) return false;
        }
      }
      if (best < 0) return true;
      for (const p of through[best]!) {
        if (!usable(p)) continue;
        if (--left < 0) return 'stop';
        for (const c of p.path) open[c] = false;
        chosen.push(p);
        const found = search();
        if (found === true) return true;
        chosen.pop();
        for (const c of p.path) open[c] = true;
        if (found === 'stop') return 'stop';
      }
      return false;
    };
    const result = search();
    return result === true ? chosen : result === 'stop' ? 'unknown' : null;
  }

  return { paths, find, complete };
}
