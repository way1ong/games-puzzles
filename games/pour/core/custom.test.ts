// The player's own size (docs/pour/SPEC.md, "Свій розмір"): sizes are kept within the bounds of the config and, with
// many colours, the empty bottles follow; a saved size outside them is not taken; the size of every kind of free
// play; a deal of the player's size — at the corners of the bounds too — is whole, has its empty bottles and is
// solved; a game of it carries its size and has a row of its own in the statistics.
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, KINDS, POUR } from '../config.ts';
import { isClosed, isWhole } from './bottles.ts';
import { emptyRange, fitSize, sizeOf, validSize } from './custom.ts';
import { customDeal } from './level.ts';
import { newPlay, pourIn } from './play.ts';
import { solve } from './solve.ts';
import { emptyStats, recordLeft, recordWon } from './stats.ts';

const b = POUR.custom;
const CAP = POUR.capacity;

describe('the player\'s own size', () => {
  it('keeps the colours within their bounds, no more than the paints in the box', () => {
    expect(b.colours.most).toBeLessThanOrEqual(POUR.paints);
    expect(fitSize({ colours: 1, empty: 2 }).colours).toBe(b.colours.least);
    expect(fitSize({ colours: 99, empty: 2 }).colours).toBe(b.colours.most);
    expect(fitSize({ colours: 6.4, empty: 2.2 })).toEqual({ colours: 6, empty: 2 });
    expect(fitSize({ colours: Number.NaN, empty: Number.NaN })).toEqual(b.first);
  });

  it('allows one empty bottle up to the config\'s colours, and more colours have more', () => {
    const { above, empty } = b.manyColours;
    expect(emptyRange(above)).toEqual({ least: b.empty.least, most: b.empty.most });
    expect(emptyRange(above + 1)).toEqual({ least: empty, most: b.empty.most });
    expect(fitSize({ colours: above, empty: 1 }).empty).toBe(1);
    expect(fitSize({ colours: above + 1, empty: 1 }).empty).toBe(empty);
    expect(fitSize({ colours: above, empty: 99 }).empty).toBe(b.empty.most);
    // no empty bottle can never be solved: every bottle would start full
    expect(fitSize({ colours: 5, empty: 0 }).empty).toBe(b.empty.least);
    expect(b.empty.least).toBeGreaterThanOrEqual(1);
  });

  it('starts as the config\'s first size, which is within the bounds', () => {
    expect(validSize(b.first)).toBe(true);
    expect(sizeOf('custom', null)).toEqual(b.first);
  });

  it('takes a saved size only when it is within the bounds', () => {
    expect(validSize({ colours: 8, empty: 2 })).toBe(true);
    expect(validSize({ colours: b.manyColours.above + 1, empty: 1 })).toBe(false);
    expect(validSize({ colours: 12, empty: 2 })).toBe(false);
    expect(validSize({ colours: 8 })).toBe(false);
    expect(validSize({ colours: '8', empty: 2 })).toBe(false);
    expect(validSize(null)).toBe(false);
  });

  it('gives the size of every kind of free play: a difficulty\'s own, the player\'s chosen one', () => {
    for (const diff of DIFFICULTIES) expect(sizeOf(diff, { colours: 3, empty: 3 })).toEqual({ colours: POUR.difficulties[diff], empty: POUR.empty });
    expect(sizeOf('custom', { colours: 4, empty: 1 })).toEqual({ colours: 4, empty: 1 });
    expect(sizeOf('custom', { colours: 99, empty: 1 })).toEqual(fitSize({ colours: 99, empty: 1 }));
  });
});

describe('a deal of the player\'s size', () => {
  it('is whole, has its empty bottles and is solved — at the corners of the bounds too', () => {
    const { above, empty } = b.manyColours;
    const sizes = [
      { colours: b.colours.least, empty: b.empty.least },
      { colours: above, empty: b.empty.least },
      { colours: above + 1, empty },
      { colours: b.colours.most, empty },
      { colours: b.colours.most, empty: b.empty.most },
    ];
    for (const size of sizes) {
      for (let seed = 1; seed <= 4; seed++) {
        const d = customDeal(size, seed);
        expect(d.colours).toBe(size.colours);
        expect(d.bottles).toHaveLength(size.colours + size.empty);
        expect(d.bottles.slice(size.colours).every((x) => x.length === 0)).toBe(true);
        expect(isWhole(d.bottles, size.colours, CAP)).toBe(true);
        expect(d.bottles.some((x) => isClosed(x, CAP))).toBe(false);
        expect(solve(d.bottles, CAP, POUR.solveLimit).moves).not.toBe(null);
      }
    }
  });

  it('is the same from the same seed; a size beyond the bounds is brought within them', () => {
    expect(customDeal({ colours: 6, empty: 1 }, 7)).toEqual(customDeal({ colours: 6, empty: 1 }, 7));
    const d = customDeal({ colours: b.manyColours.above + 2, empty: 1 }, 3);
    expect(d.bottles).toHaveLength(d.colours + b.manyColours.empty);
  });

  it('makes a game that carries its size; a difficulty\'s game carries none', () => {
    const size = { colours: 4, empty: 1 };
    const play = newPlay(customDeal(size, 5), 'free', { difficulty: 'custom', size });
    expect(play.size).toEqual(size);
    expect(play.difficulty).toBe('custom');
    expect(play.bottles).toHaveLength(5);
    expect(newPlay(customDeal(size, 5), 'free', { difficulty: 'easy' }).size).toBeNull();
  });
});

describe('statistics of the player\'s own size', () => {
  it('has a row of its own: left and won games count there', () => {
    expect(Object.keys(emptyStats().free)).toEqual([...KINDS]);
    expect(recordLeft(emptyStats(), 'custom').free.custom.played).toBe(1);
    // play a small deal to the end by its solution
    const size = { colours: b.colours.least, empty: b.empty.most };
    let play = newPlay(customDeal(size, 2), 'free', { difficulty: 'custom', size });
    for (const move of solve(play.bottles, CAP, POUR.solveLimit).moves!) play = pourIn(play, move)!;
    expect(play.done).toBe(true);
    const won = recordWon(emptyStats(), play);
    expect(won.free.custom).toEqual({ played: 1, won: 1, clean: 1, bestMoves: play.moves });
    expect(won.free.easy.won).toBe(0);
  });
});
