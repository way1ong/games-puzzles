// The course of a game (docs/pour/SPEC.md): pours, "Undo", "One more bottle", "Start again", the help a level
// allows (decision of 27.11: without limits by default, limited in the menu), the time and the end. Pure: every
// function returns a new game, or null when the action cannot be made.
import { POUR, type Difficulty, type HelpRule } from '../config.ts';
import { isSolved, isWhole, pour, pourAmount, type Bottle, type Bottles, type Move } from './bottles.ts';
import type { Deal } from './level.ts';
import { placeKey } from './solve.ts';

/** The way a game is played (decision of 27.11: the player chooses). */
export const WAYS = ['level', 'free', 'daily'] as const;
export type Way = (typeof WAYS)[number];

/** A pour made, enough to take it back. */
export interface Poured extends Move {
  amount: number;
}

export interface PourPlay {
  way: Way;
  /** Levels in a row: the level. */
  level: number | null;
  /** Free play: the difficulty. */
  difficulty: Difficulty | null;
  /** The level of the day: its date. */
  daily: string | null;
  seed: number;
  colours: number;
  /** The paint of each colour (art/palette.ts). */
  paints: number[];
  /** The deal, with the empty bottles added since: "Start again" goes back here. */
  start: Bottles;
  bottles: Bottles;
  /** Pours since the start or the last "Start again", for "Undo". */
  history: Poured[];
  /** Pours made in this attempt, the undone ones too. */
  moves: number;
  undos: number;
  hints: number;
  /** Empty bottles added. */
  extra: number;
  restarts: number;
  ms: number;
  done: boolean;
}

export function newPlay(deal: Deal, way: Way, where: { level?: number; difficulty?: Difficulty; daily?: string } = {}): PourPlay {
  return {
    way,
    level: where.level ?? null,
    difficulty: where.difficulty ?? null,
    daily: where.daily ?? null,
    seed: deal.seed,
    colours: deal.colours,
    paints: deal.paints,
    start: deal.bottles,
    bottles: deal.bottles,
    history: [],
    moves: 0,
    undos: 0,
    hints: 0,
    extra: 0,
    restarts: 0,
    ms: 0,
    done: false,
  };
}

export function pourIn(play: PourPlay, move: Move): PourPlay | null {
  if (play.done) return null;
  const amount = pourAmount(play.bottles, move, POUR.capacity);
  if (!amount) return null;
  const bottles = pour(play.bottles, move, POUR.capacity);
  return { ...play, bottles, history: [...play.history, { ...move, amount }], moves: play.moves + 1, done: isSolved(bottles, POUR.capacity) };
}

export interface HelpLeft {
  /** null — any number. */
  undo: number | null;
  hints: number | null;
  extra: number;
}

export function helpLeft(play: PourPlay, rule: HelpRule): HelpLeft {
  return {
    undo: rule.undo === null ? null : Math.max(0, rule.undo - play.undos),
    hints: rule.hints === null ? null : Math.max(0, rule.hints - play.hints),
    extra: Math.max(0, rule.extra - play.extra),
  };
}

/** The bottles with the last `count` pours taken back. */
export function takenBack(play: PourPlay, count: number): Bottles {
  let bottles = play.bottles;
  for (const p of play.history.slice(play.history.length - count).reverse()) {
    const to = bottles[p.to]!;
    const colour = to[to.length - 1]!;
    bottles = bottles.map((b, i): Bottle => (i === p.to ? b.slice(0, b.length - p.amount) : i === p.from ? [...b, ...Array<number>(p.amount).fill(colour)] : b));
  }
  return bottles;
}

/** Takes back `count` pours (each counted); null when there are not so many or the help allows fewer. */
export function undo(play: PourPlay, rule: HelpRule, count = 1): PourPlay | null {
  if (play.done || count < 1 || play.history.length < count) return null;
  const left = helpLeft(play, rule).undo;
  if (left !== null && left < count) return null;
  return { ...play, bottles: takenBack(play, count), history: play.history.slice(0, play.history.length - count), undos: play.undos + count };
}

/** One more empty bottle (it stays for "Start again" too). */
export function addBottle(play: PourPlay, rule: HelpRule): PourPlay | null {
  if (play.done || helpLeft(play, rule).extra < 1) return null;
  return { ...play, start: [...play.start, []], bottles: [...play.bottles, []], extra: play.extra + 1 };
}

/** The same deal from the start; not counted as help. */
export function startAgain(play: PourPlay): PourPlay | null {
  if (play.done || (!play.history.length && play.moves === 0)) return null;
  return { ...play, bottles: play.start, history: [], moves: 0, restarts: play.restarts + 1 };
}

/** A hint was shown (counted when given). */
export function countHint(play: PourPlay): PourPlay {
  return { ...play, hints: play.hints + 1 };
}

/** May a hint be given now? */
export function hintAllowed(play: PourPlay, rule: HelpRule): boolean {
  const left = helpLeft(play, rule).hints;
  return !play.done && (left === null || left > 0);
}

/** Won without help: no pour taken back, no hint, no bottle added. */
export const clean = (play: PourPlay): boolean => play.undos === 0 && play.hints === 0 && play.extra === 0;

export function addTime(play: PourPlay, ms: number): PourPlay {
  return play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms };
}

/** Begun: a pour made, or help used. */
export const started = (play: PourPlay): boolean => play.moves > 0 || play.restarts > 0 || play.extra > 0;

/** A saved game that is whole: every colour's layers there, and its pours lead from the start to the bottles. */
export function validPlay(play: PourPlay): boolean {
  const n = play.bottles.length;
  if (play.start.length !== n || play.paints.length !== play.colours) return false;
  if (!isWhole(play.start, play.colours, POUR.capacity) || !isWhole(play.bottles, play.colours, POUR.capacity)) return false;
  const fits = (p: Poured) => [p.from, p.to, p.amount].every(Number.isInteger) && p.from >= 0 && p.from < n && p.to >= 0 && p.to < n && p.amount >= 1 && p.amount <= POUR.capacity;
  if (!play.history.every(fits)) return false;
  return placeKey(takenBack(play, play.history.length)) === placeKey(play.start);
}
