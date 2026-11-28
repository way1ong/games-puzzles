// The rules of a picture in colour behind the screen's face (ui/rules.ts; docs/nonograms/SPEC.md, "Кольорові малюнки"):
// core/colour-play.ts and core/colour-hint.ts; the board draws a painted cell as filled, in its paint's colour and
// pattern (ui/paint.ts); its saved play is kept apart from the black-and-white one (ui/storage.ts).
import { PALETTE, PAPER, type Colour } from '../art/palette.ts';
import { NO_PAINT, colourCluesOfPicture, lengthsOf, valuesOf } from '../core/colour-clues.ts';
import { colourHintFor, type ColourHint } from '../core/colour-hint.ts';
import {
  BLANK as COLOUR_BLANK,
  CROSS as COLOUR_CROSS,
  colourAddTime,
  colourClear,
  colourCountHint,
  colourFittingLines,
  colourFullButWrong,
  colourMistakes,
  colourPut,
  colourStroke,
  colourUndo,
  newColourPlay,
  type ColourPlay,
} from '../core/colour-play.ts';
import { EMPTY_PIXEL, pixelsOf, type Picture } from '../core/picture.ts';
import { BLANK, CROSS, FILL, type Mark } from '../core/play.ts';
import { paintLooks } from './paint.ts';
import type { AnyHint, AnyPlay, PictureRules } from './rules.ts';
import * as store from './storage.ts';
import { colourCellLabel, colourHintText, colourNumber } from './words.ts';

export function colourRules(picture: Picture): PictureRules {
  const clues = colourCluesOfPicture(picture);
  const values = valuesOf(picture, clues.paints);
  const paintOf = (colour: string) => clues.paints.indexOf(colour) + 1;
  // Only colour plays and hints ever reach these rules: the screen keeps each with the rules it came from.
  const p = (play: AnyPlay) => play as ColourPlay;
  const h = (hint: AnyHint) => hint as ColourHint;
  const boardMark = (m: number): Mark => (m > COLOUR_BLANK ? FILL : m === COLOUR_CROSS ? CROSS : BLANK);
  return {
    picture,
    colour: {
      paints: clues.paints,
      looks: paintLooks(clues.paints),
      numbers: { rows: clues.rows.map((c) => c.map((r) => paintOf(r.colour))), cols: clues.cols.map((c) => c.map((r) => paintOf(r.colour))) },
    },
    clues: lengthsOf(clues),
    number: colourNumber(picture),
    load: () => store.loadColourPlay(picture, clues),
    fresh: () => newColourPlay(picture),
    save: (play) => store.saveColourPlay(p(play), picture, clues),
    stroke: (play, cells, choice) =>
      colourStroke(p(play), clues, cells, { tool: choice.mode === 'cross' ? COLOUR_CROSS : choice.paint, secondTap: choice.secondTap, autoCross: choice.autoCross }),
    clear: (play, cells, autoCross) => colourClear(p(play), clues, cells, autoCross),
    undo: (play) => colourUndo(p(play)),
    countHint: (play) => colourCountHint(p(play)),
    addTime: (play, ms) => colourAddTime(p(play), ms),
    board: (play) => ({ marks: p(play).marks.map(boardMark), paints: p(play).marks.map((m) => Math.max(COLOUR_BLANK, m)) }),
    mistakes: (play) => colourMistakes(p(play).marks, values),
    fitting: (play) => colourFittingLines(p(play).marks, clues),
    fullButWrong: (play) => colourFullButWrong(p(play), clues),
    // A picture in colour ends in its colours whatever the setting (that one is for the black-and-white pictures).
    doneColours: () => pixelsOf(picture).map((px) => (px === EMPTY_PIXEL ? PAPER : PALETTE[px as Colour])),
    hint(play) {
      const found = colourHintFor(p(play), values, clues);
      return found.kind === 'none' ? null : found;
    },
    hintMarks(hint) {
      const x = h(hint);
      return {
        line: x.kind === 'line' ? { axis: x.axis, index: x.index } : null,
        fill: x.kind === 'line' ? x.paint.map((c) => c.cell) : [],
        cross: x.kind === 'line' ? x.cross : [],
        cell: x.kind === 'mistake' ? x.cell : null,
        paints: new Map(x.kind === 'line' ? x.paint.map((c) => [c.cell, c.paint] as const) : []),
      };
    },
    hintText: (hint, lang, d) => colourHintText(h(hint), clues, lang, d),
    putHint(play, hint, autoCross) {
      const x = h(hint);
      if (x.kind === 'line') return colourPut(p(play), clues, x.paint, x.cross, autoCross);
      if (x.kind === 'mistake') {
        return x.should === NO_PAINT ? colourPut(p(play), clues, [], [x.cell], autoCross) : colourPut(p(play), clues, [{ cell: x.cell, paint: x.should }], [], autoCross);
      }
      return play;
    },
    cellLabel: (play, cell, extra, d) => colourCellLabel(cell, clues, p(play).marks[cell]!, extra, d),
  };
}
