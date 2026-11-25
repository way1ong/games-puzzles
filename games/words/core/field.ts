// The Word Field (the second mode, decision of 25.11): a rectangle of tiles wholly cut into hidden words, each
// going through neighbouring cells — up, down, left or right. Made from a seed: one path through every cell (a
// snake, bent at random), cut into pieces of the step's word lengths, and a common word laid along each piece.
// Field N is the same for every player of a language (and of the same Hungarian tile setting). Pure, no DOM.
import { seedFromText } from '../../../shared/core/rng.ts';
import { WORDS, type FieldStep, type WordLang } from '../config.ts';
import type { Dictionary, Word } from './dictionary.ts';
import { makeRand, type Rand } from './rand.ts';

export interface FieldWord {
  text: string;
  /** Cells (index = row × cols + col), in reading order. */
  path: number[];
}

export interface Field {
  lang: WordLang;
  /** The level's number (from 1), or null for a daily field. */
  number: number | null;
  /** The day ("YYYY-MM-DD") of a daily field; null — a level of the sequence. */
  daily: string | null;
  cols: number;
  rows: number;
  /** The tile of each cell, row by row. */
  cells: string[];
  /** The hidden words: their paths cover every cell once. */
  words: FieldWord[];
}

type Shape = Omit<FieldStep, 'from'>;

/** The step of the Word Field levels a level belongs to. */
export function fieldStepOf(number: number): FieldStep {
  const steps = WORDS.field.levels as readonly FieldStep[];
  return [...steps].reverse().find((s) => number >= s.from) ?? steps[0]!;
}

/** The cells next to a cell: up, down, left, right. */
export function neighbours(cols: number, rows: number, cell: number): number[] {
  const r = Math.floor(cell / cols);
  const c = cell % cols;
  const out: number[] = [];
  if (r > 0) out.push(cell - cols);
  if (r < rows - 1) out.push(cell + cols);
  if (c > 0) out.push(cell - 1);
  if (c < cols - 1) out.push(cell + 1);
  return out;
}

/** Whether two cells are next to each other. */
export function touching(cols: number, a: number, b: number): boolean {
  const d = Math.abs(a - b);
  return (d === 1 && Math.floor(a / cols) === Math.floor(b / cols)) || d === cols;
}

/**
 * A path through every cell, each next cell a neighbour: a snake row by row, then bent `moves` times — an end of
 * the path is joined to one of its neighbours and the part between is turned round ("backbite").
 */
export function wholePath(cols: number, rows: number, rand: Rand, moves: number): number[] {
  const path: number[] = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) path.push(r * cols + (r % 2 ? cols - 1 - i : i));
  const at = new Array<number>(cols * rows);
  const index = () => path.forEach((cell, i) => (at[cell] = i));
  index();
  for (let m = 0; m < moves; m++) {
    const fromStart = rand.int(2) === 0;
    const end = fromStart ? path[0]! : path[path.length - 1]!;
    const options = neighbours(cols, rows, end);
    const i = at[options[rand.int(options.length)]!]!;
    if (fromStart) {
      if (i < 2) continue;
      // p[i-1] … p[0], p[i] …: the start joins p[i]
      const head = path.slice(0, i).reverse();
      path.splice(0, i, ...head);
    } else {
      if (i > path.length - 3) continue;
      // … p[i], p[n-1] … p[i+1]: the end joins p[i]
      const tail = path.slice(i + 1).reverse();
      path.splice(i + 1, tail.length, ...tail);
    }
    index();
  }
  return path;
}

/** Word lengths between `min` and `max` that add up to `total`, in a random order of the possible ones. */
export function cutLengths(total: number, min: number, max: number, rand: Rand): number[] {
  const possible: boolean[] = [true];
  for (let t = 1; t <= total; t++) {
    possible[t] = false;
    for (let l = min; l <= Math.min(max, t); l++) if (possible[t - l]) possible[t] = true;
  }
  if (!possible[total]) throw new Error(`${total} cells cannot be cut into words of ${min}–${max}`);
  const out: number[] = [];
  let left = total;
  while (left > 0) {
    const ways: number[] = [];
    for (let l = min; l <= Math.min(max, left); l++) if (possible[left - l]) ways.push(l);
    const l = ways[rand.int(ways.length)]!;
    out.push(l);
    left -= l;
  }
  return out;
}

const pools = new WeakMap<Dictionary, Map<number, Word[]>>();

/** The hidden words of a length: those of that many tiles among the most frequent crossword words. */
function poolOf(dict: Dictionary, length: number): Word[] {
  let byLength = pools.get(dict);
  if (!byLength) pools.set(dict, (byLength = new Map()));
  let pool = byLength.get(length);
  if (!pool) {
    const ofLength = (w: Word) => w.tiles.length === length;
    pool = dict.answers.slice(0, WORDS.field.common).filter(ofLength);
    if (!pool.length) pool = dict.answers.filter(ofLength);
    byLength.set(length, pool);
  }
  if (!pool.length) throw new Error(`No words of ${length} tiles in ${dict.lang}`);
  return pool;
}

function build(dict: Dictionary, shape: Shape, seed: string, number: number | null, daily: string | null): Field {
  const { cols, rows, word } = shape;
  const rand = makeRand(seedFromText(seed));
  const path = wholePath(cols, rows, rand, WORDS.field.bends * cols * rows);
  const cells = new Array<string>(cols * rows).fill('');
  const used = new Set<string>();
  const words: FieldWord[] = [];
  let at = 0;
  for (const length of cutLengths(cols * rows, word.min, word.max, rand)) {
    const piece = path.slice(at, at + length);
    at += length;
    const pool = poolOf(dict, length);
    // A word not in this field yet (while the pool has one).
    const fresh = pool.filter((w) => !used.has(w.text));
    const options = fresh.length ? fresh : pool;
    const chosen = options[rand.int(options.length)]!;
    used.add(chosen.text);
    const along = rand.int(2) === 0 ? piece : [...piece].reverse();
    along.forEach((cell, i) => (cells[cell] = chosen.tiles[i]!));
    words.push({ text: chosen.text, path: along });
  }
  return { lang: dict.lang, number, daily, cols, rows, cells, words };
}

const tileMode = (dict: Dictionary) => (dict.options.huTiles ? 'tiles' : 'letters');

/** Word Field level `number` (from 1) of the language. */
export function makeFieldLevel(dict: Dictionary, number: number): Field {
  return build(dict, fieldStepOf(number), `way1ong-words:field:${dict.lang}:${tileMode(dict)}:level:${number}`, number, null);
}

/** The daily Word Field of a day: the same for every player of the language. */
export function makeFieldDaily(dict: Dictionary, dateKey: string): Field {
  return build(dict, WORDS.field.daily, `way1ong-words:field:${dict.lang}:${tileMode(dict)}:daily:${dateKey}`, null, dateKey);
}
