// Words of the screen made from the game's state: a picture's title (its number in the album or its name), a line's
// numbers as read ("2 1", "0"; in colour "red 2, green 1"), a line's and a cell's names for screen readers, and what a
// hint says.
import { COLOUR_PICTURES } from '../art/colour.ts';
import { PICTURES } from '../art/pictures.ts';
import { chapterOf } from '../core/album.ts';
import { clueAt, type Axis, type Clue, type Clues } from '../core/clues.ts';
import { NO_PAINT, colourClueAt, type ColourClue, type ColourClues } from '../core/colour-clues.ts';
import type { ColourHint } from '../core/colour-hint.ts';
import { CROSS as COLOUR_CROSS, type ColourMark } from '../core/colour-play.ts';
import type { Hint } from '../core/hint.ts';
import type { Picture } from '../core/picture.ts';
import { CROSS, FILL, type Mark } from '../core/play.ts';
import { fmt, plural, type Dict } from './i18n.ts';

type PictureKey = keyof Dict['pictures'];
type PaintKey = keyof Dict['paints'];

export const pictureName = (picture: Picture, d: Dict): string => d.pictures[picture.name as PictureKey] ?? picture.name;

/** Its place in its chapter of the album, from 1. */
export const pictureNumber = (picture: Picture): number => chapterOf(PICTURES, picture.size).findIndex((p) => p.id === picture.id) + 1;

/** Its place in its chapter of the colour section, from 1. */
export const colourNumber = (picture: Picture): number => chapterOf(COLOUR_PICTURES, picture.size).findIndex((p) => p.id === picture.id) + 1;

/** "Picture 7", or the name: once solved, or from the start when the setting says so. */
export const pictureTitle = (picture: Picture, d: Dict, named: boolean, number = pictureNumber(picture)): string =>
  named ? pictureName(picture, d) : fmt(d.album.picture, { n: number });

export const sizeText = (size: number, d: Dict): string => fmt(d.album.size, { size });

/** A chapter of the colour section: "In colour · 10 × 10". */
export const colourSizeText = (size: number, d: Dict): string => fmt(d.album.colourSize, { size });

/** A colour's name (a letter of art/palette.ts). */
export const paintName = (colour: string, d: Dict): string => d.paints[colour as PaintKey] ?? colour;

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

/** A colour line's numbers as they are read: "red 2, green 1"; "0" for a line with none. */
export const colourClueText = (clue: ColourClue, d: Dict): string =>
  clue.length ? clue.map((r) => fmt(d.colour.run, { colour: paintName(r.colour, d), n: r.length })).join(', ') : '0';

/** A cell's name in a colour picture: where it is, what is in it (its paint by name), its line's numbers. */
export function colourCellLabel(cell: number, clues: ColourClues, mark: ColourMark, extra: string | null, d: Dict): string {
  const row = Math.floor(cell / clues.size);
  const col = cell % clues.size;
  const state = mark > 0 ? fmt(d.cell.paint, { colour: paintName(clues.paints[mark - 1]!, d) }) : mark === COLOUR_CROSS ? d.cell.cross : d.cell.blank;
  return fmt(d.cell.label, {
    row: row + 1,
    col: col + 1,
    state: extra ? `${state}, ${extra}` : state,
    rowClue: colourClueText(colourClueAt(clues, 'row', row), d),
    colClue: colourClueText(colourClueAt(clues, 'col', col), d),
  });
}

/** What a hint of a colour picture says: the mistake's right colour; or the line, how many cells to paint and in which colours, how many to cross. */
export function colourHintText(hint: ColourHint, clues: ColourClues, lang: string, d: Dict): string {
  if (hint.kind === 'mistake') {
    const what = hint.should === NO_PAINT ? d.hint.mistakeEmpty : fmt(d.hint.mistakePaint, { colour: paintName(clues.paints[hint.should - 1]!, d) });
    return `${what} ${d.hint.againFix}`;
  }
  if (hint.kind !== 'line') return '';
  const parts: string[] = [];
  if (hint.paint.length) {
    const byPaint = new Map<number, number>();
    for (const p of hint.paint) byPaint.set(p.paint, (byPaint.get(p.paint) ?? 0) + 1);
    const order = [...byPaint.keys()].sort((a, b) => a - b);
    const name = (paint: number) => paintName(clues.paints[paint - 1]!, d);
    // one colour: its name; more: each with how many — "(red — 2, green — 1)"
    const list = order.length === 1 ? name(order[0]!) : order.map((p) => fmt(d.colour.count, { colour: name(p), n: byPaint.get(p)! })).join(', ');
    parts.push(`${plural(lang, hint.paint.length, d.hint.fill, { n: hint.paint.length })} ${fmt(d.colour.which, { list })}`);
  }
  if (hint.cross.length) parts.push(plural(lang, hint.cross.length, d.hint.cross, { n: hint.cross.length }));
  const what = parts.length === 2 ? fmt(d.hint.and, { a: parts[0]!, b: parts[1]! }) : (parts[0] ?? '');
  const line = fmt(d.hint.line, { line: lineName(hint.axis, hint.index, d), clue: colourClueText(colourClueAt(clues, hint.axis, hint.index), d), what });
  return `${line} ${d.hint.again}`;
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
