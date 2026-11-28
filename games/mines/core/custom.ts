// The player's own size (docs/mines/SPEC.md, "Свій розмір"; decision of 28.11): cells across and down and mines within
// the bounds of the config — a field of any such size is made without guessing quickly. The rule of a field of any
// kind: a level's, or the player's size with any reasoning. Pure.
import { MINES, type Kind, type LevelRule } from '../config.ts';

export interface CustomSize {
  width: number;
  height: number;
  mines: number;
}

/** The first place and its neighbours never hold a mine. */
const START_AREA = 9;

/** The fewest and the most mines a field of this size may hold. */
export function minesRange(width: number, height: number): { least: number; most: number } {
  const cells = width * height;
  const least = MINES.custom.mines.least;
  return { least, most: Math.max(least, Math.min(cells - START_AREA, Math.floor(cells * MINES.custom.mines.share))) };
}

const within = (n: number, least: number, most: number) => Math.min(most, Math.max(least, Math.round(n)));

/** A size brought within the bounds: each side into its range, then the mines into the range of that size. */
export function fitSize(size: CustomSize): CustomSize {
  const b = MINES.custom;
  const width = within(Number.isFinite(size.width) ? size.width : b.first.width, b.width.least, b.width.most);
  const height = within(Number.isFinite(size.height) ? size.height : b.first.height, b.height.least, b.height.most);
  const { least, most } = minesRange(width, height);
  return { width, height, mines: within(Number.isFinite(size.mines) ? size.mines : b.first.mines, least, most) };
}

/** A saved size that is whole numbers within the bounds. */
export function validSize(size: unknown): size is CustomSize {
  const s = size as Partial<CustomSize> | null;
  if (!s || typeof s !== 'object' || ![s.width, s.height, s.mines].every((n) => Number.isInteger(n))) return false;
  const fit = fitSize(s as CustomSize);
  return fit.width === s.width && fit.height === s.height && fit.mines === s.mines;
}

/** The rule of a field: a level's, or the player's own size (made whole first) with any reasoning a person can do. */
export function ruleOf(kind: Kind, size: CustomSize | null): LevelRule {
  if (kind !== 'custom') return MINES.levels[kind];
  return { ...fitSize(size ?? MINES.custom.first), logic: MINES.custom.logic };
}
