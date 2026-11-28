// The pictures (docs/jigsaw/SPEC.md, "Малюнки"): the rooms of Detective by day and by night — our own drawings in
// code — and their close-ups (a part of a room's drawing, 3 : 2 as the whole room), with things on their places as in
// Detective's free search, placed from the puzzle's seed. One SVG text per picture, with its size in pixels, so that
// it can be drawn into an image once.
import { sceneSvg } from '../../detective/art/scene.ts';
import { DETECTIVE } from '../../detective/config.ts';
import { searchCase } from '../../detective/core/daily.ts';
import { CROPS, PICTURES, type Picture } from '../config.ts';
import { partSeed } from '../core/seeds.ts';

/** A picture's width and height, in the drawing's own units (3 : 2). */
export const PICTURE_SIZE = { width: DETECTIVE.scene.width, height: DETECTIVE.scene.height } as const;

/** The part of the room's drawing a picture shows (x, y, width, height): the whole room, or its close-up. */
export function viewOf(p: Picture): { x: number; y: number; w: number; h: number } {
  if (p.crop === null) return { x: 0, y: 0, w: PICTURE_SIZE.width, h: PICTURE_SIZE.height };
  const c = (CROPS[p.room] as Record<string, { x: number; y: number; w: number }>)[p.crop]!;
  return { x: c.x, y: c.y, w: c.w, h: (c.w * PICTURE_SIZE.height) / PICTURE_SIZE.width };
}

/** The picture of a puzzle: its room at its time, with things from the puzzle's seed (none: null — the bare room). */
export function pictureSvg(picture: number, seed: number | null): string {
  const p = PICTURES[picture]!;
  const { room, time } = p;
  const things = seed === null ? [] : searchCase(room, time, partSeed(seed, 'things')).things;
  const { width, height } = PICTURE_SIZE;
  const v = viewOf(p);
  // a size of its own, so a browser draws it into an image at the size asked (some do not without it)
  return sceneSvg({ room, time, things }, { width, height, preserveAspectRatio: 'none', viewBox: `${v.x} ${v.y} ${v.w} ${v.h}` });
}

/** The picture as a data address. */
export function pictureUrl(picture: number, seed: number | null): string {
  return `data:image/svg+xml,${encodeURIComponent(pictureSvg(picture, seed))}`;
}
