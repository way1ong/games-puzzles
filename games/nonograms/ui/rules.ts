// The picture in play behind one face (docs/nonograms/SPEC.md): black and white (core/play.ts, ui/plain-rules.ts) or in
// colour (core/colour-play.ts, ui/colour-rules.ts; "Кольорові малюнки"). The game screen holds a play of either kind
// and asks its rules for moves, hints, mistakes, finished lines, what the board draws, words for screen readers and
// what is saved, without asking which kind it is — but where the two differ on purpose: the tools under the grid, the
// tip, the solved pictures and the statistics (`colour`).
import type { Axis, Clues } from '../core/clues.ts';
import type { ColourHint } from '../core/colour-hint.ts';
import type { ColourPlay } from '../core/colour-play.ts';
import type { Hint } from '../core/hint.ts';
import type { Picture } from '../core/picture.ts';
import type { Mark, Mode, Play, SecondTap } from '../core/play.ts';
import type { Dict } from './i18n.ts';
import type { PaintLook } from './paint.ts';

export type AnyPlay = Play | ColourPlay;
export type AnyHint = Hint | ColourHint;

/** What a stroke puts: the tool under the grid (paint or cross) and, in a colour picture, the paint chosen (1…). */
export interface StrokeChoice {
  mode: Mode;
  paint: number;
  secondTap: SecondTap;
  autoCross: boolean;
}

/** A hint as the board shows it: its line, the cells it fills (with their paints, in colour) and crosses, or a mistake's cell. */
export interface HintMarks {
  line: { axis: Axis; index: number } | null;
  fill: number[];
  cross: number[];
  cell: number | null;
  paints: ReadonlyMap<number, number> | null;
}

/** The cells as the board draws them: blank, filled or crossed, and in colour each one's paint (1…; 0 — none). */
export interface BoardMarks {
  marks: readonly Mark[];
  paints: readonly number[] | null;
}

/** A colour picture's paints: their letters (art/palette.ts, the first is paint 1), looks and names' keys; the paint of each number. */
export interface ColourSide {
  paints: readonly string[];
  looks: readonly PaintLook[];
  numbers: { rows: number[][]; cols: number[][] };
}

export interface PictureRules {
  readonly picture: Picture;
  /** A colour picture's paints and numbers; null — black and white. */
  readonly colour: ColourSide | null;
  /** The numbers' lengths: what the board measures its room by. */
  readonly clues: Clues;
  /** Its place in its chapter (of the album, or of the colour section), from 1. */
  readonly number: number;

  /** The saved play (of today, for the picture of the day), or null. */
  load(): AnyPlay | null;
  fresh(): AnyPlay;
  save(play: AnyPlay): void;

  stroke(play: AnyPlay, cells: readonly number[], choice: StrokeChoice): AnyPlay;
  clear(play: AnyPlay, cells: readonly number[], autoCross: boolean): AnyPlay;
  undo(play: AnyPlay): AnyPlay;
  countHint(play: AnyPlay): AnyPlay;
  addTime(play: AnyPlay, ms: number): AnyPlay;

  board(play: AnyPlay): BoardMarks;
  /** Cells against the answer. */
  mistakes(play: AnyPlay): number[];
  /** The lines that fit their numbers ("row3", "col0"). */
  fitting(play: AnyPlay): Set<string>;
  /** As many cells painted as the numbers ask, yet not solved. */
  fullButWrong(play: AnyPlay): boolean;
  /** The picture's colours at the end, cell by cell (its paper where empty); null — in the ink (the setting off). */
  doneColours(colourSetting: boolean): string[] | null;

  /** A hint for the play; null — nothing more to find. */
  hint(play: AnyPlay): AnyHint | null;
  hintMarks(hint: AnyHint): HintMarks;
  hintText(hint: AnyHint, lang: string, d: Dict): string;
  /** What a second press of "Hint" does: puts what the hint shows, or fixes the mistake. */
  putHint(play: AnyPlay, hint: AnyHint, autoCross: boolean): AnyPlay;

  /** A cell's name for screen readers: where it is, what is in it, its line's numbers (and a hint's or mistake's word). */
  cellLabel(play: AnyPlay, cell: number, extra: string | null, d: Dict): string;
}
