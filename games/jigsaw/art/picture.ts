// The pictures (docs/jigsaw/SPEC.md, "Малюнки"): the rooms of Detective by day and by night — our own drawings in
// code — with things on their places as in Detective's free search, placed from the puzzle's seed. One SVG text per
// picture, with its size in pixels, so that it can be drawn into an image once.
import { sceneSvg } from '../../detective/art/scene.ts';
import { DETECTIVE } from '../../detective/config.ts';
import { searchCase } from '../../detective/core/daily.ts';
import { PICTURES } from '../config.ts';
import { partSeed } from '../core/seeds.ts';

/** A picture's width and height, in the drawing's own units (3 : 2). */
export const PICTURE_SIZE = { width: DETECTIVE.scene.width, height: DETECTIVE.scene.height } as const;

/** The picture of a puzzle: its room at its time, with things from the puzzle's seed (none: null — the bare room). */
export function pictureSvg(picture: number, seed: number | null): string {
  const { room, time } = PICTURES[picture]!;
  const things = seed === null ? [] : searchCase(room, time, partSeed(seed, 'things')).things;
  const { width, height } = PICTURE_SIZE;
  // a size of its own, so a browser draws it into an image at the size asked (some do not without it)
  return sceneSvg({ room, time, things }, { width, height, preserveAspectRatio: 'none' });
}

/** The picture as a data address. */
export function pictureUrl(picture: number, seed: number | null): string {
  return `data:image/svg+xml,${encodeURIComponent(pictureSvg(picture, seed))}`;
}
