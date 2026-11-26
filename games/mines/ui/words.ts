// Words of the screen made from the game's state: a cell's name for screen readers, and what a hint says — which
// cells are safe or hold mines, and on what numbers that rests (docs/mines/SPEC.md, "Керування").
import type { Theme } from '../config.ts';
import type { MinesHint } from '../core/hint.ts';
import { FLAG, OPEN } from '../core/play.ts';
import { fmt, plural, type Dict } from './i18n.ts';

/** A cell's name: where it is, what it shows, what marks it carries. */
export function cellLabel(cell: number, cols: number, state: string, n: number | null, extra: string[], theme: Theme, lang: string, d: Dict): string {
  const t = d.themes[theme];
  const what =
    state === FLAG ? d.cell.flag : state === OPEN ? (n === null ? t.hidden : n === 0 ? d.cell.empty : plural(lang, n, t.number, { n })) : d.cell.closed;
  return fmt(d.cell.label, { row: Math.floor(cell / cols) + 1, col: (cell % cols) + 1, state: [what, ...extra].join(', ') });
}

/** What a hint says on the screen ("Hint" turns into "Do it" meanwhile: the second press does it). */
export function hintText(hint: MinesHint, numberOf: (cell: number) => number, theme: Theme, lang: string, d: Dict): string {
  const t = d.themes[theme];
  if (hint.kind === 'choose') return d.game.tipPlayer;
  if (hint.kind === 'wrongFlags') return plural(lang, hint.cells.length, t.wrongFlags, { n: hint.cells.length });
  if (hint.kind === 'safe') return d.hint.safeOnly;
  const s = hint.step;
  const parts: string[] = [];
  if (s.safe.length) parts.push(plural(lang, s.safe.length, d.hint.safe, { n: s.safe.length }));
  if (s.mines.length) parts.push(plural(lang, s.mines.length, t.mines, { n: s.mines.length }));
  const what = parts.length === 2 ? fmt(d.hint.and, { a: parts[0]!, b: parts[1]! }) : (parts[0] ?? '');
  let text: string;
  if (s.logic === 'single') {
    const n = numberOf(s.from[0]!);
    text = s.safe.length ? fmt(d.hint.singleSafe, { n, what }) : fmt(t.singleMines, { n, what });
  } else if (s.logic === 'pair') {
    text = fmt(d.hint.pair, { a: numberOf(s.from[0]!), b: numberOf(s.from[1]!), what });
  } else if (s.count) {
    text = fmt(t.allCount, { n: hint.left, what });
  } else {
    text = fmt(d.hint.all, { what });
  }
  return text;
}
