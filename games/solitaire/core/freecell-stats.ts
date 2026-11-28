// FreeCell's statistics (docs/solitaire/SPEC.md, "Вільні клітинки"): for each number of free cells — deals played (won,
// or left with moves made), won, won without hints, the best time. Like Klondike's for each way of turning the stock
// (stats.ts). Pure.
import { FREE_CELLS, type FreeCells } from '../config.ts';
import { cellsOf, type FreeCell } from './freecell.ts';
import type { DrawStats } from './stats.ts';

export type FreeCellStats = Record<FreeCells, DrawStats>;

export const emptyFreeCellStats = (): FreeCellStats =>
  Object.fromEntries(FREE_CELLS.map((n) => [n, { played: 0, won: 0, clean: 0, bestMs: null }])) as FreeCellStats;

/** A deal left unfinished after moves were made: played, not won. */
export function recordFreeCellLeft(stats: FreeCellStats, g: FreeCell): FreeCellStats {
  if (g.done || g.history.length === 0) return stats;
  const n = cellsOf(g);
  const s = stats[n];
  return { ...stats, [n]: { ...s, played: s.played + 1 } };
}

/** A deal won. */
export function recordFreeCellWon(stats: FreeCellStats, g: FreeCell): FreeCellStats {
  const n = cellsOf(g);
  const s = stats[n];
  return {
    ...stats,
    [n]: {
      played: s.played + 1,
      won: s.won + 1,
      clean: s.clean + (g.hints === 0 ? 1 : 0),
      bestMs: s.bestMs === null ? g.ms : Math.min(s.bestMs, g.ms),
    },
  };
}
