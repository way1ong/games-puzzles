// Mines ("Сапер"): every number of the rules and the game's addresses (docs/mines/SPEC.md). (C) = Claude's proposal
// within the plan approved on 26.11; change it here, not in the logic.
import { gameAddress } from '../../shared/core/address.ts';

/** Levels from the easiest (docs/mines/SPEC.md, "Рівні"). */
export const LEVELS = ['easy', 'medium', 'hard'] as const;
export type Level = (typeof LEVELS)[number];

/**
 * The reasoning a field may ask for, simplest first (core/solve.ts): one number and its closed neighbours; two numbers
 * that share neighbours; all the numbers along the edge together with the number of mines left. The solver, the maker
 * of fields and the hint try them in this order, so a hint always shows the simplest step there is.
 */
export const LOGICS = ['single', 'pair', 'all'] as const;
export type Logic = (typeof LOGICS)[number];

export interface LevelRule {
  width: number;
  height: number;
  mines: number;
  /** The hardest reasoning a field of this level may ask for. */
  logic: Logic;
}

/** The theme of the field (decision of 26.11: mines by default, flowers in the menu). */
export const THEMES = ['mines', 'flowers'] as const;
export type Theme = (typeof THEMES)[number];

/** Who opens the first place (decision of 26.11: the player chooses in the menu; the game by default — C). */
export const STARTS = ['game', 'player'] as const;
export type Start = (typeof STARTS)[number];

/** What happens after a mine (decision of 26.11: start over by default, undoing the move in the menu). */
export const AFTER_MINE = ['restart', 'undo'] as const;
export type AfterMine = (typeof AFTER_MINE)[number];

export const MINES = {
  /** The game's name where it is installed and in the shared daily result; the short name is app.name in the dictionaries. */
  name: 'way1ong Mines',
  /** The studio's site for the "Made by way1ong" line, and the game itself for the shared result; null — not public yet. */
  links: { site: null as string | null, game: gameAddress('mines') },
  /**
   * The classic sizes (docs/mines/SPEC.md, "Рівні"); the easy one as before Windows 98, 8 × 8, so that it fits a phone
   * held upright from 360 px across with cells of 44 px (C).
   */
  levels: {
    easy: { width: 8, height: 8, mines: 10, logic: 'single' },
    medium: { width: 16, height: 16, mines: 40, logic: 'pair' },
    hard: { width: 30, height: 16, mines: 99, logic: 'all' },
  } satisfies Record<Level, LevelRule>,
  defaultLevel: 'easy' as Level,
  /**
   * The solver's limits for the reasoning over all the numbers together (C): the most closed cells along the edge it
   * weighs in one group, and the most steps of its search in one group; beyond them the field counts as not solvable
   * (the maker takes another) and a hint says only where it is safe.
   */
  solve: { groupCells: 48, groupSteps: 200_000 },
  /** The maker of fields: positions looked at in one slice of its work (the screen keeps working in between) (C). */
  makeSlice: 4_000,
  /**
   * A cell's size, CSS px: comfortable under a finger (rule 6) and the least that may still be touched (WCAG 2.2 AA).
   * A field that fits the screen only with cells under `comfortable` opens zoomed in to that size (as Nonograms) (C).
   */
  cell: { comfortable: 44, least: 24 },
  /** The largest cell when zoomed in, CSS px (C). */
  zoomMaxCell: 88,
  /** Pixels a finger or the mouse travels before a press moves the field instead of touching a cell (C). */
  dragStart: 8,
  /** A press this long puts or takes a flag, ms (C: about 0.4 s, as in common games — docs/mines/SPEC.md, "Керування"). */
  longPressMs: 400,
  /** A short buzz when a flag is put (a setting, off by default) (C). */
  vibrateMs: 12,
} as const;
