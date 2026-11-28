// The pictures (docs/jigsaw/SPEC.md, "Малюнки"): the six rooms keep their places in the list (a saved puzzle keeps its
// picture's number); every room has its three close-ups by day and by night; a close-up lies within the room's drawing
// and is 3 : 2 as the whole room, so the pieces stay square; the sizes of a puzzle are 3 : 2 too.
import { describe, expect, it } from 'vitest';
import { CROPS, DIFFICULTIES, JIGSAW, PICTURES } from '../config.ts';
import { dailyPictureCount } from '../core/seeds.ts';
import { PICTURE_SIZE, pictureSvg, viewOf } from './picture.ts';

describe('the pictures', () => {
  it('keep the six rooms first, in their old order', () => {
    expect(PICTURES.slice(0, 6).map((p) => `${p.room} ${p.time} ${p.crop}`)).toEqual([
      'study day null',
      'study night null',
      'bakery day null',
      'bakery night null',
      'station day null',
      'station night null',
    ]);
  });

  it('give every room three close-ups, by day and by night, each once', () => {
    const keys = PICTURES.map((p) => `${p.room} ${p.time} ${p.crop}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [room, crops] of Object.entries(CROPS)) {
      expect(Object.keys(crops)).toHaveLength(3);
      for (const crop of Object.keys(crops)) {
        for (const time of ['day', 'night']) expect(keys).toContain(`${room} ${time} ${crop}`);
      }
    }
    const rooms = Object.keys(CROPS).length;
    expect(PICTURES).toHaveLength(rooms * 2 + rooms * 3 * 2);
  });

  it('put the pictures of a room that joins later at the end: before its date the puzzle of the day picks as before', () => {
    const late = PICTURES.map((p) => (JIGSAW.dailyFrom[p.room] ?? '') !== '');
    const first = late.indexOf(true);
    expect(first).toBe(6 + 3 * 3 * 2);
    expect(late.slice(first).every(Boolean)).toBe(true);
    expect(dailyPictureCount('2000-01-01')).toBe(first);
    expect(dailyPictureCount('9999-12-31')).toBe(PICTURES.length);
  });

  it('cut close-ups within the room, 3 : 2 as the whole room', () => {
    for (const p of PICTURES) {
      const v = viewOf(p);
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.y).toBeGreaterThanOrEqual(0);
      expect(v.x + v.w).toBeLessThanOrEqual(PICTURE_SIZE.width);
      expect(v.y + v.h).toBeLessThanOrEqual(PICTURE_SIZE.height);
      expect(v.w / v.h).toBeCloseTo(PICTURE_SIZE.width / PICTURE_SIZE.height, 9);
    }
  });

  it('draw a close-up as its part of the room', () => {
    const i = PICTURES.findIndex((p) => p.room === 'study' && p.crop === 'desk' && p.time === 'night');
    const v = viewOf(PICTURES[i]!);
    expect(pictureSvg(i, 5)).toContain(`viewBox="${v.x} ${v.y} ${v.w} ${v.h}"`);
    expect(pictureSvg(0, 5)).toContain(`viewBox="0 0 ${PICTURE_SIZE.width} ${PICTURE_SIZE.height}"`);
  });

  it('cut every size of a puzzle into square pieces, 150 the largest', () => {
    for (const size of DIFFICULTIES) {
      const { cols, rows } = JIGSAW.sizes[size];
      expect(cols / rows).toBeCloseTo(PICTURE_SIZE.width / PICTURE_SIZE.height, 9);
    }
    expect(JIGSAW.sizes.expert.cols * JIGSAW.sizes.expert.rows).toBe(150);
  });
});
