// The rules of a black-and-white picture behind the screen's face (ui/rules.ts): core/play.ts and core/hint.ts as
// they are, its saved play in ui/storage.ts (of today, for the picture of the day).
import { PALETTE, PAPER, type Colour } from '../art/palette.ts';
import { cluesOf } from '../core/clues.ts';
import { hintFor, type Hint } from '../core/hint.ts';
import { EMPTY_PIXEL, pixelsOf, solutionOf, type Picture } from '../core/picture.ts';
import { addTime, clear, countHint, fittingLines, fullButWrong, mistakes, newPlay, put, stroke, undo, type Mark, type Play } from '../core/play.ts';
import type { AnyHint, AnyPlay, PictureRules } from './rules.ts';
import * as store from './storage.ts';
import { cellLabel, hintText, pictureNumber } from './words.ts';

/** A black-and-white picture; `day` — the date of the picture of the day, null — a picture of the album. */
export function plainRules(picture: Picture, day: string | null): PictureRules {
  const solution = solutionOf(picture);
  const clues = cluesOf(solution, picture.size);
  // Only black-and-white plays and hints ever reach these rules: the screen keeps each with the rules it came from.
  const p = (play: AnyPlay) => play as Play;
  const h = (hint: AnyHint) => hint as Hint;
  return {
    picture,
    colour: null,
    clues,
    number: pictureNumber(picture),
    load: () => store.loadPlay(picture, clues, day),
    fresh: () => newPlay(picture, day),
    save: (play) => store.savePlay(p(play), picture),
    stroke: (play, cells, choice) => stroke(p(play), clues, cells, { mode: choice.mode, secondTap: choice.secondTap, autoCross: choice.autoCross }),
    clear: (play, cells, autoCross) => clear(p(play), clues, cells, autoCross),
    undo: (play) => undo(p(play)),
    countHint: (play) => countHint(p(play)),
    addTime: (play, ms) => addTime(p(play), ms),
    board: (play) => ({ marks: p(play).marks, paints: null }),
    mistakes: (play) => mistakes(p(play).marks, solution),
    fitting: (play) => fittingLines(p(play).marks, clues),
    fullButWrong: (play) => fullButWrong(p(play), clues),
    doneColours: (colourSetting) => (colourSetting ? pixelsOf(picture).map((px) => (px === EMPTY_PIXEL ? PAPER : PALETTE[px as Colour])) : null),
    hint(play) {
      const found = hintFor(p(play), picture, clues);
      return found.kind === 'none' ? null : found;
    },
    hintMarks(hint) {
      const x = h(hint);
      return {
        line: x.kind === 'line' ? { axis: x.axis, index: x.index } : null,
        fill: x.kind === 'line' ? x.fill : [],
        cross: x.kind === 'line' ? x.cross : [],
        cell: x.kind === 'mistake' ? x.cell : null,
        paints: null,
      };
    },
    hintText: (hint, lang, d) => hintText(h(hint), clues, lang, d),
    putHint(play, hint, autoCross) {
      const x = h(hint);
      if (x.kind === 'line') return put(p(play), clues, x.fill, x.cross, autoCross);
      if (x.kind === 'mistake') return x.should === 'fill' ? put(p(play), clues, [x.cell], [], autoCross) : put(p(play), clues, [], [x.cell], autoCross);
      return play;
    },
    cellLabel: (play, cell, extra, d) => cellLabel(cell, clues, p(play).marks[cell] as Mark, extra, d),
  };
}
