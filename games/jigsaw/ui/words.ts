// Words about the puzzle for the screen and for screen readers: a picture's name, a piece's name and kind (which corner
// or side of the picture it comes from — the straight sides one feels on a real piece), a place's name. From the
// dictionaries; rows and columns are counted from 1.
import type { Picture } from '../config.ts';
import { kindOf } from '../core/cut.ts';
import { fmt, type Dict } from './i18n.ts';

const capital = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

/** The key of a picture's name in the dictionaries: "studyDay", "bakeryNight"; a close-up's — "studyDeskDay"… */
export const pictureKey = (p: Picture): string => `${p.room}${p.crop === null ? '' : capital(p.crop)}${capital(p.time)}`;

export function pictureName(p: Picture, d: Dict): string {
  return d.pictures[pictureKey(p) as keyof Dict['pictures']];
}

/** "corner, top left" / "edge, right" / "from the middle". */
export function kindText(cols: number, rows: number, piece: number, d: Dict): string {
  const r = Math.floor(piece / cols);
  const c = piece % cols;
  const kind = kindOf(cols, rows, piece);
  if (kind === 'corner') return d.piece.corner[`${r === 0 ? 't' : 'b'}${c === 0 ? 'l' : 'r'}` as 'tl' | 'tr' | 'bl' | 'br'];
  if (kind === 'edge') return d.piece.edge[r === 0 ? 'top' : r === rows - 1 ? 'bottom' : c === 0 ? 'left' : 'right'];
  return d.piece.inner;
}

/** "Piece 7: corner, top left" (and marks: taken, the hint). `n` — the piece's number in the tray. */
export function pieceLabel(n: number, cols: number, rows: number, piece: number, d: Dict, marks: string[] = []): string {
  return [`${fmt(d.piece.name, { n })}: ${kindText(cols, rows, piece, d)}`, ...marks].join('; ');
}

/** "Row 2, column 3" (and marks: a piece in place, the hint's place). */
export function placeLabel(place: number, cols: number, d: Dict, marks: string[] = []): string {
  return [fmt(d.board.place, { r: Math.floor(place / cols) + 1, c: (place % cols) + 1 }), ...marks].join('; ');
}
