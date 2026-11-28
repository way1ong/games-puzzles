// The pictures of the fifteen: a room that joins later (SLIDE.fifteen.picturesFrom) has its pictures at the end, so
// before its date the fifteen of the day picks its picture as before; every picture is drawn.
import { describe, expect, it } from 'vitest';
import { SLIDE } from '../config.ts';
import { dailyPictureCount, PICTURES, pictureUrl } from './pictures.ts';

describe('the pictures of the fifteen', () => {
  it('put the pictures of a room that joins later at the end: before its date the day picks as before', () => {
    const late = PICTURES.map((p) => (SLIDE.fifteen.picturesFrom[p.room] ?? '') !== '');
    const first = late.indexOf(true);
    expect(first).toBe(6);
    expect(late.slice(first).every(Boolean)).toBe(true);
    expect(dailyPictureCount('2000-01-01')).toBe(first);
    expect(dailyPictureCount('9999-12-31')).toBe(PICTURES.length);
  });

  it('draw every picture as a square from the middle of its room', () => {
    for (let i = 0; i < PICTURES.length; i++) expect(pictureUrl(i)).toMatch(/^data:image\/svg\+xml,/);
  });
});
