// The pictures of the fifteen (docs/slide/SPEC.md, "Плитки: числа чи малюнок"): the rooms of Detective by day and by
// night — our own drawings in code — a square from the middle of each. Each is made once, as a data address for the
// tiles' background (the drawing holds its colours itself; no file, no request).
import { sceneSvg } from '../../detective/art/scene.ts';
import { DETECTIVE } from '../../detective/config.ts';
import { SLIDE } from '../config.ts';

/** A saved game keeps its picture's number, so new pictures only ever go at the end. */
export const PICTURES = [
  { room: 'study', time: 'day' },
  { room: 'study', time: 'night' },
  { room: 'bakery', time: 'day' },
  { room: 'bakery', time: 'night' },
  { room: 'station', time: 'day' },
  { room: 'station', time: 'night' },
  { room: 'post', time: 'day' },
  { room: 'post', time: 'night' },
] as const;

/** How many pictures the fifteen of the day picks from on a date: a room that joins later stands at the end. */
export function dailyPictureCount(date: string): number {
  return PICTURES.filter((p) => (SLIDE.fifteen.picturesFrom[p.room] ?? '') <= date).length;
}

const made = new Map<number, string>();

/** The picture as a data address: the square in the middle of the room's sheet. */
export function pictureUrl(index: number): string {
  let url = made.get(index);
  if (!url) {
    const { room, time } = PICTURES[index % PICTURES.length]!;
    const { width, height } = DETECTIVE.scene;
    const side = Math.min(width, height);
    const crop = `${(width - side) / 2} ${(height - side) / 2} ${side} ${side}`;
    const svg = sceneSvg({ room, time, things: [] }).replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${crop}"`);
    url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    made.set(index, url);
  }
  return url;
}
