// The player's own size in free play (docs/pour/SPEC.md, "Свій розмір"; decision of 28.11): how many colours and how
// many empty bottles, within the bounds of the config; with many colours the empty bottles follow (one is too few for
// a solvable deal to come soon). The size of each kind of free play. Pure.
import { POUR, type Kind } from '../config.ts';

export interface CustomSize {
  colours: number;
  /** Empty bottles at the start (before any "One more bottle"). */
  empty: number;
}

export interface Range {
  least: number;
  most: number;
}

/** The empty bottles a deal of this many colours may have. */
export function emptyRange(colours: number): Range {
  const { empty, manyColours } = POUR.custom;
  return { least: colours > manyColours.above ? Math.max(empty.least, manyColours.empty) : empty.least, most: empty.most };
}

const clamp = (value: number, range: Range, fallback: number): number =>
  Math.min(range.most, Math.max(range.least, Number.isFinite(value) ? Math.round(value) : fallback));

/** The nearest size within the bounds: the colours first, then the empty bottles they allow. */
export function fitSize(size: CustomSize): CustomSize {
  const { colours, first } = POUR.custom;
  const c = clamp(size.colours, colours, first.colours);
  return { colours: c, empty: clamp(size.empty, emptyRange(c), first.empty) };
}

/** A size kept on the device and taken back as it is: whole numbers within the bounds. */
export function validSize(size: unknown): size is CustomSize {
  const s = size as Partial<CustomSize> | null;
  if (!s || typeof s !== 'object' || !Number.isInteger(s.colours) || !Number.isInteger(s.empty)) return false;
  const fit = fitSize(s as CustomSize);
  return fit.colours === s.colours && fit.empty === s.empty;
}

/** The colours and empty bottles of a kind of free play: a difficulty's, or the player's own (the config's first one until chosen). */
export function sizeOf(kind: Kind, size: CustomSize | null): CustomSize {
  if (kind !== 'custom') return { colours: POUR.difficulties[kind], empty: POUR.empty };
  return fitSize(size ?? POUR.custom.first);
}
