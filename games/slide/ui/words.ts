// Words about the boards for the screen and for screen readers: a tile's and a piece's name and place, the hints.
// From the dictionaries; rows and columns are counted from 1.
import type { Face, Theme } from '../config.ts';
import { sizeOf, wayOf, type BoxMove, type BoxPuzzle, type Spots } from '../core/box.ts';
import type { Move, Places, Puzzle } from '../core/unblock.ts';
import { fmt, type Dict } from './i18n.ts';
import { kindOf } from './unblock-view.ts';

/** The first letter as a capital, for a name at the start of a label. */
const capital = (text: string, lang: string) => text.charAt(0).toLocaleUpperCase(lang) + text.slice(1);

/** "Tile 7, row 2, column 3" (and the hint's mark). */
export function tileLabel(tile: number, cell: number, size: number, d: Dict, marks: string[] = []): string {
  const where = fmt(d.board.at, { r: Math.floor(cell / size) + 1, c: (cell % size) + 1 });
  return [`${fmt(d.board.tile, { n: tile })}, ${where}`, ...marks].join('; ');
}

export function pieceName(puzzle: Puzzle, piece: number, theme: Theme, d: Dict): string {
  return d.pieces[theme][kindOf(puzzle, piece)];
}

/** "The sofa, lying in row 3, columns 1–2" / "A wardrobe, standing in column 5, rows 2–4" (and marks). */
export function pieceLabel(puzzle: Puzzle, places: Places, piece: number, theme: Theme, d: Dict, lang: string, marks: string[] = []): string {
  const p = puzzle.pieces[piece]!;
  const at = places[piece]!;
  const name = capital(pieceName(puzzle, piece, theme, d), lang);
  const text = p.across
    ? fmt(d.board.lying, { name, r: p.line + 1, from: at + 1, to: at + p.length })
    : fmt(d.board.standing, { name, c: p.line + 1, from: at + 1, to: at + p.length });
  return [text, ...marks].join('; ');
}

/** "Hint: a barge — up." */
export function pieceHint(puzzle: Puzzle, places: Places, move: Move, theme: Theme, d: Dict): string {
  const p = puzzle.pieces[move.piece]!;
  const forward = move.to > places[move.piece]!;
  const way = p.across ? (forward ? 'right' : 'left') : forward ? 'down' : 'up';
  return fmt(d.game.hintPiece, { piece: pieceName(puzzle, move.piece, theme, d), way: d.game.ways[way] });
}

/** The name of a piece of "The chest": the chest, a small block, a long one. */
export function blockName(puzzle: BoxPuzzle, piece: number, d: Dict): string {
  return d.blocks[puzzle.shapes[piece]!];
}

/** "The chest, rows 1–2, columns 2–3" / "A small block, row 3, column 1" / "A long block, lying in row 4, columns 1–2". */
export function blockLabel(puzzle: BoxPuzzle, spots: Spots, piece: number, d: Dict, lang: string, marks: string[] = []): string {
  const shape = puzzle.shapes[piece]!;
  const [w, h] = sizeOf(shape);
  const at = spots[piece]!;
  const [c, r] = [(at % puzzle.cols) + 1, Math.floor(at / puzzle.cols) + 1];
  const name = capital(blockName(puzzle, piece, d), lang);
  let text: string;
  if (shape === 'chest') text = fmt(d.board.chestAt, { name, r, r2: r + h - 1, c, c2: c + w - 1 });
  else if (shape === 'lying') text = fmt(d.board.lying, { name, r, from: c, to: c + w - 1 });
  else if (shape === 'standing') text = fmt(d.board.standing, { name, c, from: r, to: r + h - 1 });
  else text = fmt(d.board.single, { name, r, c });
  return [text, ...marks].join('; ');
}

/** "Hint: the chest — down." */
export function blockHint(puzzle: BoxPuzzle, spots: Spots, move: BoxMove, d: Dict): string {
  const way = wayOf(puzzle, spots, move)?.way ?? 'down';
  return fmt(d.game.hintPiece, { piece: blockName(puzzle, move.piece, d), way: d.game.ways[way] });
}

/** "Hint: slide tile 7." — on a picture without numbers, the marked tile. */
export function tileHint(tile: number, face: Face, d: Dict): string {
  return face === 'picture' ? d.game.hintMarked : fmt(d.game.hintTile, { n: tile });
}

/** How to play, for each face of the fifteen, each look of "Clear the way", and "The chest". */
export function tipText(d: Dict, mode: 'fifteen' | 'unblock' | 'box', face: Face, theme: Theme): string {
  if (mode === 'fifteen') return face === 'numbers' ? d.game.tipNumbers : d.game.tipPicture;
  if (mode === 'box') return d.game.tipChest;
  return { harbour: d.game.tipHarbour, room: d.game.tipRoom, box: d.game.tipBox }[theme];
}
