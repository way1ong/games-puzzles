// The course of a game: deal pieces, place them, clear lines, count points, end the game; in the calm
// mode also turn pieces and take moves back. Pure functions: a state in, a new state out (or null for a
// move that is not allowed). The whole state is plain data, so it can be saved and restored.
import { BLOCKS, type ShapeId } from '../config.ts';
import { canPlace, clearLines, emptyBoard, fitsAnywhere, fullLines, place } from './board.ts';
import { movePoints } from './scoring.ts';
import { drawPiece, rotate, rotations, SHAPE_IDS, type Piece } from './shapes.ts';

export type Mode = 'classic' | 'calm' | 'daily';
export const MODES: readonly Mode[] = ['classic', 'calm', 'daily'];

/** Why the game ended: no piece fits anywhere, or the daily puzzle's rounds are all played. */
export type End = 'stuck' | 'completed';

export interface Position {
  board: number[];
  /** The pieces on offer; null where a piece has already been placed. */
  tray: (Piece | null)[];
  /** State of the seeded random numbers. */
  rng: number;
  nextId: number;
  score: number;
  /** Rounds dealt so far. */
  round: number;
  lines: number;
  end: End | null;
}

export interface GameState extends Position {
  version: 1;
  mode: Mode;
  seed: number;
  size: number;
  /** Calm mode: the positions before each move, for taking moves back. */
  history: Position[];
}

export interface Move {
  state: GameState;
  /** Points this move earned. */
  points: number;
  /** Rows and columns cleared by this move. */
  rows: number[];
  cols: number[];
}

/** 1-based number of a shape, kept in the board cells (0 — empty). */
export function shapeCode(shape: ShapeId): number {
  return SHAPE_IDS.indexOf(shape) + 1;
}

function position(state: GameState): Position {
  const { board, tray, rng, nextId, score, round, lines, end } = state;
  return { board, tray, rng, nextId, score, round, lines, end };
}

function deal(state: GameState): GameState {
  let rng = state.rng;
  let nextId = state.nextId;
  const tray: Piece[] = [];
  for (let i = 0; i < BLOCKS.piecesPerRound; i++) {
    const drawn = drawPiece(rng, nextId++);
    tray.push(drawn.piece);
    rng = drawn.state;
  }
  return { ...state, tray, rng, nextId, round: state.round + 1 };
}

/** Whether some piece on offer can still be placed (in the calm mode — in any quarter turn). */
export function canContinue(state: GameState): boolean {
  return state.tray.some(
    (piece) =>
      piece !== null &&
      (state.mode === 'calm'
        ? rotations(piece.cells).some((cells) => fitsAnywhere(state.board, state.size, cells))
        : fitsAnywhere(state.board, state.size, piece.cells)),
  );
}

function withEnd(state: GameState): GameState {
  return { ...state, end: canContinue(state) ? null : 'stuck' };
}

export function newGame(mode: Mode, seed: number): GameState {
  const start: GameState = {
    version: 1,
    mode,
    seed,
    size: BLOCKS.boardSize,
    board: emptyBoard(BLOCKS.boardSize),
    tray: [],
    rng: seed >>> 0,
    nextId: 1,
    score: 0,
    round: 0,
    lines: 0,
    end: null,
    history: [],
  };
  return withEnd(deal(start));
}

/** Places the piece from tray slot `slot` with its top-left cell at (row, col); null if not allowed. */
export function placePiece(state: GameState, slot: number, row: number, col: number): Move | null {
  if (state.end) return null;
  const piece = state.tray[slot];
  if (!piece || !canPlace(state.board, state.size, piece.cells, row, col)) return null;

  const placed = place(state.board, state.size, piece.cells, row, col, shapeCode(piece.shape));
  const full = fullLines(placed, state.size);
  const cleared = full.rows.length + full.cols.length;
  const points = movePoints(piece.cells.length, cleared);
  const tray = state.tray.map((p, i) => (i === slot ? null : p));

  let next: GameState = {
    ...state,
    board: clearLines(placed, state.size, full),
    tray,
    score: state.score + points,
    lines: state.lines + cleared,
    history: state.mode === 'calm' ? [...state.history, position(state)] : state.history,
  };

  if (tray.every((p) => p === null)) {
    if (state.mode === 'daily' && state.round >= BLOCKS.dailyRounds) {
      return { state: { ...next, end: 'completed' }, points, rows: full.rows, cols: full.cols };
    }
    next = deal(next);
  }
  return { state: withEnd(next), points, rows: full.rows, cols: full.cols };
}

/** Calm mode: a quarter turn of the piece in tray slot `slot`. Other modes: no change. */
export function turnPiece(state: GameState, slot: number): GameState {
  const piece = state.tray[slot];
  if (state.mode !== 'calm' || state.end || !piece) return state;
  const tray = state.tray.map((p, i) => (i === slot && p ? { ...p, cells: rotate(p.cells) } : p));
  return { ...state, tray };
}

/** Calm mode: the position before the last move. Other modes or no moves yet: no change. */
export function undo(state: GameState): GameState {
  if (state.mode !== 'calm') return state;
  const previous = state.history[state.history.length - 1];
  if (!previous) return state;
  return { ...state, ...previous, history: state.history.slice(0, -1) };
}
