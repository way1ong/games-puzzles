// The set of puzzles of "The chest" (docs/slide/SPEC.md, "Скринька", "Головоломки складено заздалегідь"): every line
// is a board by the rules, its letters in reading order, the first in order of itself and its mirror image, and met
// once; the set keeps to its limits (none of the traditional sets of blocks, so many puzzles of each number of moves,
// few blocks on the easiest); every number of moves the levels and difficulties ask for is there; and every puzzle,
// counted again from scratch, needs exactly the fewest moves written, within the positions' limit, drawn among many
// positions of its number of moves.
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, SLIDE } from '../config.ts';
import text from '../levels/box.txt?raw';
import { keyOf, parseBox, plainText } from './box.ts';
import { allPositions, layersOf, type BoxPositions } from './box-solve.ts';
import { levelMoves, levelPuzzle, puzzlesOf } from './level.ts';
import { parsePool, poolLine } from './pool.ts';
import { canonicalText } from './unblock.ts';

const POOL = parsePool(text);
const free = (board: string) => [...board].filter((c) => c === '.').length;

describe('the set of puzzles of the chest', () => {
  it('holds boards by the rules, each once (a mirror image too), written in reading order, one a line', () => {
    expect(POOL.length).toBeGreaterThan(0);
    for (const p of POOL) {
      expect(() => parseBox(p.text)).not.toThrow();
      expect(canonicalText(p.text)).toBe(p.text);
      expect(plainText(p.text)).toBe(p.text);
    }
    expect(new Set(POOL.map((p) => plainText(p.text))).size).toBe(POOL.length);
    expect(POOL.map(poolLine).join('\n') + '\n').toBe(text);
  });

  it('keeps to its limits: none of the traditional sets, so many of each number of moves, few blocks on the easiest', () => {
    const count = new Map<number, number>();
    for (const p of POOL) count.set(p.moves, (count.get(p.moves) ?? 0) + 1);
    expect(Math.min(...count.keys())).toBe(SLIDE.box.stages[0]!.moves[0]);
    expect(Math.max(...count.values())).toBeLessThanOrEqual(SLIDE.box.pool.perMoves);
    for (const p of POOL) {
      const shapes = parseBox(p.text).puzzle.shapes;
      const small = shapes.filter((s) => s === 'single').length;
      const pairs = shapes.filter((s) => s === 'lying' || s === 'standing').length;
      expect(SLIDE.box.pool.traditional.some(([a, b]) => a === small && b === pairs), p.text).toBe(false);
      if (p.moves <= SLIDE.box.pool.sparseUpTo) expect(free(p.text), p.text).toBeGreaterThanOrEqual(SLIDE.box.pool.sparseFree[0]);
    }
  });

  it('has every number of moves the levels ask for, and plenty for each difficulty', () => {
    const last = SLIDE.box.stages[SLIDE.box.stages.length - 1]!;
    for (let level = 1; level < last.from + 2 * (last.moves[1] - last.moves[0] + 1); level++) {
      expect(levelPuzzle(POOL, level, SLIDE.box).moves).toBe(levelMoves(level, SLIDE.box));
    }
    for (const difficulty of DIFFICULTIES) expect(puzzlesOf(POOL, difficulty, SLIDE.box).length).toBeGreaterThanOrEqual(SLIDE.box.pool.perMoves);
  });

  it('counted again, every puzzle needs the fewest moves written, within the positions’ limit, drawn among many', () => {
    // puzzles of one set of blocks may share their positions: each walk once
    const sets = new Map<string, typeof POOL>();
    for (const p of POOL) {
      const id = `${[...parseBox(p.text).puzzle.shapes].sort().join()}|${free(p.text)}`;
      sets.set(id, [...(sets.get(id) ?? []), p]);
    }
    for (const list of sets.values()) {
      const walked: { positions: BoxPositions; layers: number[][] }[] = [];
      for (const p of list) {
        const { puzzle, spots } = parseBox(p.text);
        const key = keyOf(puzzle, spots);
        let found = walked.find((w) => w.positions.index.has(key));
        if (!found) {
          const positions = allPositions(puzzle, spots, SLIDE.box.maxPositions);
          expect(positions, p.text).not.toBeNull();
          found = { positions: positions!, layers: layersOf(positions!) };
          walked.push(found);
        }
        const moves = found.positions.toExit[found.positions.index.get(key)!]!;
        expect(moves, p.text).toBe(p.moves);
        expect(found.layers[moves]!.length, p.text).toBeGreaterThanOrEqual(SLIDE.box.pool.layerAtLeast);
      }
    }
  });
});
