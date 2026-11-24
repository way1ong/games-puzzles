// What a hint says and shows at each of its stages: "where to look" first, then every step with its reason,
// then the digit. Texts come from the dictionary; the marks tell the board what to highlight. On harder
// levels a step rests on candidates, so the board shows them in the cells the step speaks of.
import type { Technique } from '../config.ts';
import type { Game } from '../core/game.ts';
import { PEERS, UNITS, bit, type UnitKind } from '../core/grid.ts';
import type { Hint } from '../core/hint.ts';
import { applyStep, positionOf } from '../core/logic.ts';
import type { Position, Step } from '../core/techniques.ts';
import type { HintMarks } from './board-view.ts';
import { fmt, plural, type Dict } from './i18n.ts';

/** 'where' — the first stage; a number — the step being explained. */
export type HintStage = 'where' | number;

export type HintAction = 'explain' | 'next' | 'place' | 'erase';

export interface HintScreen {
  title: string;
  text: string;
  /** "Step 2 of 3" when the hint has several steps. */
  counter: string | null;
  marks: HintMarks;
  action: HintAction;
}

const NONE: HintMarks = { target: null, cells: new Set(), pivot: null, area: new Set(), cands: new Map(), struck: new Map(), bad: new Set() };

const kindOf = (unit: number): UnitKind => UNITS[unit]!.kind;
const lineKind = (unit: number): 'row' | 'col' => (kindOf(unit) === 'col' ? 'col' : 'row');
const cellsOf = (units: readonly number[]): Set<number> => new Set(units.flatMap((u) => UNITS[u]!.cells));

/** The position before each step: the board as it is, then after each removal. */
function positions(game: Game, steps: readonly Step[]): Position[] {
  const pos = positionOf(game.digits);
  return steps.map((step) => {
    const before = { values: [...pos.values], cands: [...pos.cands] };
    applyStep(pos, step);
    return before;
  });
}

/** The parameters every text of a step may use: its digits as the language names them. */
function params(step: Step, d: Dict): Record<string, string> {
  const name = (n: number | undefined) => (n ? d.digits[String(n) as keyof Dict['digits']] : '');
  const [a, b, c] = step.digits;
  return { digit: name(a), a: name(a), b: name(b), c: name(c), x: name(a), y: name(b), z: name(c) };
}

/** "Where to look" for a step. */
function whereText(step: Step, d: Dict): string {
  const p = params(step, d);
  const u = step.units[0] ?? 0;
  const w = d.where;
  const texts: Record<Technique, () => string> = {
    fullHouse: () => w.fullHouse[kindOf(u)],
    hiddenSingle: () => w.hiddenSingle[kindOf(u)],
    nakedSingle: () => w.nakedSingle,
    pointing: () => w.pointing,
    claiming: () => w.claiming[lineKind(u)],
    nakedPair: () => w.nakedPair,
    hiddenPair: () => w.hiddenPair[kindOf(u)],
    nakedTriple: () => w.nakedTriple,
    hiddenTriple: () => w.hiddenTriple[kindOf(u)],
    xWing: () => w.xWing[kindOf(u) === 'col' ? 'cols' : 'rows'],
    swordfish: () => w.swordfish[kindOf(u) === 'col' ? 'cols' : 'rows'],
    xyWing: () => w.xyWing,
    xyzWing: () => w.xyzWing,
  };
  return fmt(texts[step.technique](), p);
}

/** Why a step holds; `after` — the step comes after removals. */
function whyText(step: Step, d: Dict, after: boolean): string {
  const p = params(step, d);
  const u = step.units[0] ?? 0;
  const w = d.why;
  const texts: Record<Technique, () => string> = {
    fullHouse: () => w.fullHouse,
    hiddenSingle: () => (after ? d.whyAfter.hiddenSingle : w.hiddenSingle)[kindOf(u)],
    nakedSingle: () => (after ? d.whyAfter.nakedSingle : w.nakedSingle),
    pointing: () => w.pointing[lineKind(step.units[1] ?? 0)],
    claiming: () => w.claiming[lineKind(u)],
    nakedPair: () => w.nakedPair[kindOf(u)],
    hiddenPair: () => w.hiddenPair[kindOf(u)],
    nakedTriple: () => w.nakedTriple[kindOf(u)],
    hiddenTriple: () => w.hiddenTriple[kindOf(u)],
    xWing: () => w.xWing[kindOf(u) === 'col' ? 'cols' : 'rows'],
    swordfish: () => w.swordfish[kindOf(u) === 'col' ? 'cols' : 'rows'],
    xyWing: () => w.xyWing,
    xyzWing: () => w.xyzWing,
  };
  return fmt(texts[step.technique](), p);
}

/** Placed digits that keep the step's digit out of the unit's other free cells — the reason, made visible. */
function blockers(pos: Position, step: Step): Set<number> {
  const out = new Set<number>();
  const { cell, digit } = step.place!;
  for (const other of UNITS[step.units[0]!]!.cells) {
    if (other === cell || pos.values[other]) continue;
    const blocker = PEERS[other]!.find((peer) => pos.values[peer] === digit);
    if (blocker !== undefined) out.add(blocker);
  }
  return out;
}

/** What the board shows while a step is explained. */
function stepMarks(pos: Position, step: Step, after: boolean): HintMarks {
  const cands = new Map<number, number>();
  const struck = new Map<number, number>();
  const show = (cell: number) => {
    if (!pos.values[cell]) cands.set(cell, pos.cands[cell]!);
  };
  if (step.place) {
    const { cell, digit } = step.place;
    const area = cellsOf(step.units);
    if (step.technique === 'hiddenSingle' && after) for (const c of area) if (pos.cands[c]! & bit(digit)) show(c);
    if (step.technique === 'nakedSingle' && after) show(cell);
    const cells = step.technique === 'hiddenSingle' && !after ? blockers(pos, step) : new Set<number>();
    return { ...NONE, target: cell, area, cells, cands, struck };
  }
  for (const cell of step.cells) show(cell);
  for (const e of step.eliminate) {
    show(e.cell);
    struck.set(e.cell, e.mask);
  }
  // A wing: the pivot gets a solid frame, the two cells that depend on it a dashed one.
  const wing = step.technique === 'xyWing' || step.technique === 'xyzWing';
  const pivot = wing ? step.cells[0]! : null;
  const cells = new Set(wing ? step.cells.slice(1) : step.cells);
  return { ...NONE, cells, pivot, area: cellsOf(step.units), cands, struck };
}

/** The "where to look" marks of a hint that is one step: the unit, or the cell, never the digit's place. */
function whereMarks(step: Step): HintMarks {
  if (step.technique === 'nakedSingle') return { ...NONE, target: step.place!.cell };
  return { ...NONE, area: cellsOf(step.units.slice(0, 1)) };
}

export function hintScreen(hint: Hint, stage: HintStage, game: Game, d: Dict, lang: string): HintScreen {
  if (hint.kind === 'mistakes') {
    const n = hint.cells.length;
    return {
      title: d.hint.mistakesTitle,
      text: plural(lang, n, d.hint.mistakes, { n }),
      counter: null,
      marks: { ...NONE, bad: new Set(hint.cells), cells: new Set(hint.cells) },
      action: 'erase',
    };
  }
  if (hint.kind === 'reveal') {
    const digit = d.digits[String(hint.digit) as keyof Dict['digits']];
    return { title: d.hint.title, text: fmt(d.hint.reveal, { digit }), counter: null, marks: { ...NONE, target: hint.cell }, action: 'place' };
  }
  const steps = hint.steps;
  const chain = steps.length > 1;
  const last = steps.length - 1;
  if (stage === 'where') {
    const first = steps[0]!;
    if (!chain) return { title: d.techniques[first.technique], text: whereText(first, d), counter: null, marks: whereMarks(first), action: 'explain' };
    const target = steps[last]!.place!.cell;
    return {
      title: d.hint.title,
      text: fmt(d.hint.chain, { name: d.techniques[first.technique] }),
      counter: null,
      marks: { ...NONE, target },
      action: 'explain',
    };
  }
  const index = Math.min(Math.max(stage, 0), last);
  const step = steps[index]!;
  const before = positions(game, steps)[index]!;
  const after = chain && index === last;
  const text = step.place ? whyText(step, d, after) : `${whereText(step, d)} ${whyText(step, d, false)}`;
  return {
    title: d.techniques[step.technique],
    text,
    counter: chain ? fmt(d.hint.stepOf, { n: index + 1, total: steps.length }) : null,
    marks: stepMarks(before, step, after),
    action: index < last ? 'next' : 'place',
  };
}
