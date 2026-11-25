// The album, the picture of the day and the statistics (docs/nonograms/SPEC.md, "Малюнки", "Що зберігається").
import { describe, expect, it } from 'vitest';
import { NONOGRAMS, type Size } from '../config.ts';
import { chapterOf, dailyPicture, dayNumber, nextUnsolved } from './album.ts';
import { addTime, countHint, newPlay } from './play.ts';
import type { Picture } from './picture.ts';
import { emptyStats, recordSolved } from './stats.ts';

const fake = (id: string, size: Size): Picture => ({ id, name: id, size, rows: Array.from({ length: size }, () => '#'.repeat(size)) });
const PICTURES = [fake('a', 5), fake('b', 10), fake('c', 5), fake('d', 10), fake('e', 15), fake('f', 10), fake('g', 10)];

describe('album', () => {
  it('keeps each size’s pictures in their order and finds the next one not solved, going round', () => {
    const chapter = chapterOf(PICTURES, 10);
    expect(chapter.map((p) => p.id)).toEqual(['b', 'd', 'f', 'g']);
    expect(nextUnsolved(chapter, new Set())?.id).toBe('b');
    expect(nextUnsolved(chapter, new Set(['b', 'd']))?.id).toBe('f');
    expect(nextUnsolved(chapter, new Set(['b']), 'f')?.id).toBe('g');
    expect(nextUnsolved(chapter, new Set(['g']), 'f')?.id).toBe('b');
    expect(nextUnsolved(chapter, new Set(['b', 'd', 'f', 'g']))).toBeNull();
  });

  it('gives a day the same picture for everybody, of the daily size, none twice until all have had their day', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('2026-11-26') - dayNumber('2026-11-25')).toBe(1);
    expect(dailyPicture(PICTURES, '2026-11-25').id).toBe(dailyPicture(PICTURES, '2026-11-25').id);
    expect(dailyPicture(PICTURES, '2026-11-25').size).toBe(NONOGRAMS.daily.size);
    const pool = chapterOf(PICTURES, NONOGRAMS.daily.size).length;
    // a whole round of days starting on the round's first day: every picture once
    const first = Math.ceil(dayNumber('2026-11-25') / pool) * pool;
    const ids = Array.from({ length: pool }, (_, k) => {
      const date = new Date((first + k) * 86_400_000).toISOString().slice(0, 10);
      return dailyPicture(PICTURES, date).id;
    });
    expect(new Set(ids).size).toBe(pool);
  });
});

describe('statistics', () => {
  it('counts the solved pictures of each size, their hints and the best time', () => {
    let stats = emptyStats();
    stats = recordSolved(stats, countHint(addTime(newPlay(fake('a', 5)), 90_000)));
    stats = recordSolved(stats, addTime(newPlay(fake('c', 5)), 60_000));
    stats = recordSolved(stats, newPlay(fake('b', 10))); // no time counted (the clock off)
    expect(stats[5]).toEqual({ solved: 2, hints: 1, bestMs: 60_000 });
    expect(stats[10]).toEqual({ solved: 1, hints: 0, bestMs: null });
    expect(stats[15].solved).toBe(0);
  });
});
