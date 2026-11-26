// Words of the screen made from the game's state: a picture's title (its number in the album or its name), a line's
// numbers as read ("2 1", "0"), a line's and a cell's names for screen readers, and what a hint says.
import { PICTURES } from '../art/pictures.ts';
import { chapterOf } from '../core/album.ts';
import { clueAt, type Axis, type Clue, type Clues } from '../core/clues.ts';
import type { Hint } from '../core/hint.ts';
import type { Picture } from '../core/picture.ts';
import { CROSS, FILL, type Mark } from '../core/play.ts';
import { fmt, plural, type Dict } from './i18n.ts';

type PictureKey = keyof Dict['pictures'];

export const pictureName = (picture: Picture, d: Dict): string => d.pictures[picture.name as PictureKey] ?? picture.name;

/** Its place in its chapter of the album, from 1. */
export const pictureNumber = (picture: Picture): number => chapterOf(PICTURES, picture.size).findIndex((p) => p.id === picture.id) + 1;

/** "Picture 7", or the name: once solved, or from the start when the setting says so. */
export const pictureTitle = (picture: Picture, d: Dict, named: boolean): string =>
  named ? pictureName(picture, d) : fmt(d.album.picture, { n: pictureNumber(picture) });

export const sizeText = (size: number, d: Dict): string => fmt(d.album.size, { size });

/** A line's numbers as they are read: "2 1"; "0" for a line with none. */
export const clueText = (clue: Clue): string => (clue.length ? clue.join(' ') : '0');

export const lineName = (axis: Axis, index: number, d: Dict): string => fmt(axis === 'row' ? d.hint.row : d.hint.col, { n: index + 1 });

/** A cell's name: where it is, what is in it, its line's numbers. */
export function cellLabel(cell: number, clues: Clues, mark: Mark, extra: string | null, d: Dict): string {
  const row = Math.floor(cell / clues.size);
  const col = cell % clues.size;
  const state = mark === FILL ? d.cell.fill : mark === CROSS ? d.cell.cross : d.cell.blank;
  return fmt(d.cell.label, {
    row: row + 1,
    col: col + 1,
    state: extra ? `${state}, ${extra}` : state,
    rowClue: clueText(clueAt(clues, 'row', row)),
    colClue: clueText(clueAt(clues, 'col', col)),
  });
}

/** What a hint says on the screen. */
export function hintText(hint: Hint, clues: Clues, lang: string, d: Dict): string {
  if (hint.kind === 'mistake') return `${hint.should === 'fill' ? d.hint.mistakeFill : d.hint.mistakeEmpty} ${d.hint.againFix}`;
  if (hint.kind !== 'line') return '';
  const parts: string[] = [];
  if (hint.fill.length) parts.push(plural(lang, hint.fill.length, d.hint.fill, { n: hint.fill.length }));
  if (hint.cross.length) parts.push(plural(lang, hint.cross.length, d.hint.cross, { n: hint.cross.length }));
  const what = parts.length === 2 ? fmt(d.hint.and, { a: parts[0]!, b: parts[1]! }) : (parts[0] ?? '');
  const line = fmt(d.hint.line, { line: lineName(hint.axis, hint.index, d), clue: clueText(clueAt(clues, hint.axis, hint.index)), what });
  return `${line} ${d.hint.again}`;
}
