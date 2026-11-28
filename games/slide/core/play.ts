// The course of a game in every mode (docs/slide/SPEC.md): slides and moves, "Undo", hints, "Start again", the time
// and the end. Help has no limit — every move can be taken back by hand anyway — but it is counted. Pure: every
// function returns a new game, or null when the action cannot be made.
import { seedFromText } from '../../../shared/core/rng.ts';
import { SLIDE, type Difficulty, type FifteenKind, type Theme } from '../config.ts';
import { cellsOf as boxCellsOf, isOut as chestOut, parseBox, sizeOf as shapeSize, slideBlock, type BoxMove } from './box.ts';
import { fewestMoves } from './fifteen-solve.ts';
import { canBeSolved, isSolved, lineToGap, slide, sizeOf, type Tiles } from './fifteen.ts';
import { pick, themeOf } from './level.ts';
import type { PoolPuzzle } from './pool.ts';
import { gridOf, isOut, parseBoard, slidePiece, type Move } from './unblock.ts';

/** How a game is played: free play, the puzzle of the day, or (in "Clear the way") levels in a row. */
export type Way = 'free' | 'daily' | 'level';

interface PlayBase {
  way: Way;
  /** The puzzle of the day: its date ("YYYY-MM-DD"). */
  daily: string | null;
  seed: number;
  undos: number;
  hints: number;
  restarts: number;
  ms: number;
  done: boolean;
}

export interface FifteenPlay extends PlayBase {
  mode: 'fifteen';
  /** Free play: the size chosen. */
  difficulty: FifteenKind | null;
  size: number;
  /**
   * The fewest moves from the start, where the game can count them exactly (3 x 3: decision of 28.11 — the player's moves
   * beside the fewest); null — a larger board.
   */
  fewest: number | null;
  /** The picture the tiles show when the player chooses a picture (one of the game's pictures). */
  picture: number;
  start: number[];
  tiles: number[];
  /** Before each slide: where the gap was (a slide back to it takes the slide back) and how many tiles moved. */
  history: { gap: number; count: number }[];
  /** Tiles slid on the way here; a slide taken back takes its tiles off. */
  moves: number;
}

export interface UnblockPlay extends PlayBase {
  mode: 'unblock';
  /** Free play: the difficulty. */
  difficulty: Difficulty | null;
  /** Levels in a row: the level. */
  level: number | null;
  theme: Theme;
  /** The puzzle as in the set: the start. */
  board: string;
  /** The fewest moves to the way out from the start. */
  fewest: number;
  places: number[];
  /** Before each move: the piece moved and where it was. */
  history: { piece: number; from: number }[];
}

export interface BoxPlay extends PlayBase {
  mode: 'box';
  /** Free play: the difficulty. */
  difficulty: Difficulty | null;
  /** Levels in a row: the level. */
  level: number | null;
  /** The puzzle as in the set: the start. */
  board: string;
  /** The fewest moves from the start until the chest is out. */
  fewest: number;
  /** Each piece's top left cell (box.ts), in the order of the board's letters. */
  places: number[];
  /** Before each move: the piece moved and where it was. */
  history: { piece: number; from: number }[];
}

export type SlidePlay = FifteenPlay | UnblockPlay | BoxPlay;

const base = (way: Way, seed: number, where: { daily?: string }) => ({
  way,
  daily: where.daily ?? null,
  seed,
  undos: 0,
  hints: 0,
  restarts: 0,
  ms: 0,
  done: false,
});

/** The fewest moves of a fifteen from its start, where they can be counted exactly (3 x 3); else null. */
export const fifteenFewest = (start: Tiles): number | null => (sizeOf(start) === 3 ? fewestMoves(start) : null);

/** A fifteen from its shuffle; the picture is drawn from the seed among `pictures`. */
export function newFifteen(tiles: Tiles, way: Exclude<Way, 'level'>, seed: number, pictures: number, where: { difficulty?: FifteenKind; daily?: string } = {}): FifteenPlay {
  return {
    ...base(way, seed, where),
    mode: 'fifteen',
    difficulty: where.difficulty ?? null,
    size: sizeOf(tiles),
    fewest: fifteenFewest(tiles),
    picture: pick(seedFromText(`way1ong-slide:picture:${seed}`), pictures),
    start: tiles.slice(),
    tiles: tiles.slice(),
    history: [],
    moves: 0,
  };
}

export function newUnblock(puzzle: PoolPuzzle, way: Way, seed: number, where: { level?: number; difficulty?: Difficulty; daily?: string } = {}): UnblockPlay {
  return {
    ...base(way, seed, where),
    mode: 'unblock',
    difficulty: where.difficulty ?? null,
    level: where.level ?? null,
    theme: themeOf(seed),
    board: puzzle.text,
    fewest: puzzle.moves,
    places: parseBoard(puzzle.text).places,
    history: [],
  };
}

export function newBox(puzzle: PoolPuzzle, way: Way, seed: number, where: { level?: number; difficulty?: Difficulty; daily?: string } = {}): BoxPlay {
  return {
    ...base(way, seed, where),
    mode: 'box',
    difficulty: where.difficulty ?? null,
    level: where.level ?? null,
    board: puzzle.text,
    fewest: puzzle.moves,
    places: parseBox(puzzle.text).spots,
    history: [],
  };
}

/** The moves of the game so far: tiles slid, or pieces moved. */
export function movesMade(play: SlidePlay): number {
  return play.mode === 'fifteen' ? play.moves : play.history.length;
}

/** Slides the tile at `cell` toward the gap (with the tiles between). */
export function slideTile(play: FifteenPlay, cell: number): FifteenPlay | null {
  if (play.done) return null;
  const gap = play.tiles.indexOf(0);
  const done = slide(play.tiles, cell);
  if (!done) return null;
  return { ...play, tiles: done.tiles, history: [...play.history, { gap, count: done.moved.length }], moves: play.moves + done.moved.length, done: isSolved(done.tiles) };
}

/** Moves a piece of "Clear the way". */
export function movePiece(play: UnblockPlay, move: Move): UnblockPlay | null {
  if (play.done) return null;
  const { puzzle } = parseBoard(play.board);
  const places = slidePiece(puzzle, play.places, move);
  if (!places) return null;
  return { ...play, places, history: [...play.history, { piece: move.piece, from: play.places[move.piece]! }], done: isOut(puzzle, places) };
}

/** Moves a piece of "The chest": one way, any number of cells; the chest over the slot — the end. */
export function moveBlock(play: BoxPlay, move: BoxMove): BoxPlay | null {
  if (play.done) return null;
  const { puzzle } = parseBox(play.board);
  const places = slideBlock(puzzle, play.places, move);
  if (!places) return null;
  return { ...play, places, history: [...play.history, { piece: move.piece, from: play.places[move.piece]! }], done: chestOut(puzzle, places) };
}

/** Takes the last slide or move back (counted as help). */
export function undo<P extends SlidePlay>(play: P): P | null {
  if (play.done || !play.history.length) return null;
  if (play.mode === 'fifteen') {
    const last = play.history[play.history.length - 1]!;
    const back = slide(play.tiles, last.gap);
    if (!back) return null;
    return { ...play, tiles: back.tiles, history: play.history.slice(0, -1), moves: play.moves - last.count, undos: play.undos + 1 };
  }
  const last = play.history[play.history.length - 1]!;
  const places = play.places.slice();
  places[last.piece] = last.from;
  return { ...play, places, history: play.history.slice(0, -1), undos: play.undos + 1 };
}

/** The same puzzle from the start; not counted as help. */
export function startAgain<P extends SlidePlay>(play: P): P | null {
  if (play.done || !play.history.length) return null;
  if (play.mode === 'fifteen') return { ...play, tiles: play.start.slice(), history: [], moves: 0, restarts: play.restarts + 1 };
  const places = play.mode === 'box' ? parseBox(play.board).spots : parseBoard(play.board).places;
  return { ...play, places, history: [], restarts: play.restarts + 1 };
}

/** A hint was shown (counted when given). */
export function countHint<P extends SlidePlay>(play: P): P {
  return { ...play, hints: play.hints + 1 };
}

export function addTime<P extends SlidePlay>(play: P, ms: number): P {
  return play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms };
}

/** Solved without help: nothing taken back, no hint. */
export const clean = (play: SlidePlay): boolean => play.undos === 0 && play.hints === 0;

/** The fewest moves from the start, if the game knows them ("Clear the way", "The chest", a 3 x 3 fifteen). */
export const fewestOf = (play: SlidePlay): number | null => play.fewest;

/** Solved without help in the fewest moves (where the game knows them). */
export const perfect = (play: SlidePlay): boolean => play.done && clean(play) && play.fewest !== null && movesMade(play) === play.fewest;

/** Begun: a move made, or the puzzle started again. */
export const started = (play: SlidePlay): boolean => play.history.length > 0 || play.restarts > 0 || play.hints > 0;

/** A saved game that is whole: its moves lead from its start to where it is. */
export function validPlay(play: SlidePlay): boolean {
  try {
    if (play.mode === 'fifteen') {
      const n = play.size * play.size;
      if (play.fewest !== fifteenFewest(play.start)) return false;
      const isBoard = (t: readonly number[]) => t.length === n && [...t].sort((a, b) => a - b).every((v, i) => v === i);
      if (!isBoard(play.start) || !isBoard(play.tiles) || !canBeSolved(play.start)) return false;
      let tiles: number[] = play.tiles.slice();
      let moves = 0;
      for (const step of [...play.history].reverse()) {
        if (!lineToGap(tiles, step.gap).length || lineToGap(tiles, step.gap).length !== step.count) return false;
        tiles = slide(tiles, step.gap)!.tiles;
        moves += step.count;
      }
      return moves === play.moves && tiles.join() === play.start.join() && play.done === isSolved(play.tiles);
    }
    if (play.mode === 'box') {
      const { puzzle, spots: start } = parseBox(play.board);
      if (play.places.length !== start.length || !Number.isInteger(play.fewest) || play.fewest < 1) return false;
      // every piece within the frame, none over another
      const { cols, rows } = SLIDE.box;
      const fits = puzzle.shapes.every((shape, i) => {
        const at = play.places[i]!;
        const [w, h] = shapeSize(shape);
        return Number.isInteger(at) && at >= 0 && (at % cols) + w <= cols && Math.floor(at / cols) + h <= rows;
      });
      if (!fits || new Set(puzzle.shapes.flatMap((shape, i) => boxCellsOf(puzzle, shape, play.places[i]!))).size !== puzzle.shapes.reduce((sum, shape) => sum + shapeSize(shape)[0] * shapeSize(shape)[1], 0)) return false;
      let places = play.places.slice();
      for (const step of [...play.history].reverse()) {
        const back = slideBlock(puzzle, places, { piece: step.piece, to: step.from });
        if (!back) return false;
        places = back;
      }
      return places.join() === start.join() && play.done === chestOut(puzzle, play.places);
    }
    const { puzzle, places: start } = parseBoard(play.board);
    if (play.places.length !== start.length || !Number.isInteger(play.fewest) || play.fewest < 1) return false;
    const covered = gridOf(puzzle, play.places).filter((c) => c > 0).length;
    if (covered !== puzzle.pieces.reduce((sum, p) => sum + p.length, 0)) return false;
    let places = play.places.slice();
    for (const step of [...play.history].reverse()) {
      const back = slidePiece(puzzle, places, { piece: step.piece, to: step.from });
      if (!back) return false;
      places = back;
    }
    return places.join() === start.join() && play.done === isOut(puzzle, play.places);
  } catch {
    return false;
  }
}
