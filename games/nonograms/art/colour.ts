// The colour section of the album (docs/nonograms/SPEC.md, "Кольорові малюнки"; decision of 28.11): pictures of the
// album in their own colours, with coloured numbers — those of two colours or more, within the section's bounds of
// paints and numbers in a line (config.ts), that line-by-line reasoning in colour solves to the end, so each has one
// answer and needs no guess (colour.test.ts; it also notices an album picture that belongs here and is not listed). By size; in each, the easier ones first — fewer steps of the colour solver
// (C) — and new ones go to the end of their size, so the section keeps its order. The ids are the album's: a picture's
// progress in colour is kept apart from its black-and-white one.
import type { Picture } from '../core/picture.ts';
import { PICTURES } from './pictures.ts';

export const COLOUR_IDS: readonly string[] = [
  // ---------- 5 × 5 ----------
  'tree-5',
  'flag-5',
  'house-5',
  'mushroom-5',
  'cherries-5',
  'umbrella-5',
  'sailboat-5',
  'tshirt-5',
  'egg-5',
  'gift-5',
  'rabbit-5',
  'rain-5',
  'lemon-5',
  'acorn-5',
  'flower-5',
  'icecream-5',
  'cactus-5',

  // ---------- 10 × 10 ----------
  'sun-10',
  'house-10',
  'sailboat-10',
  'mug-10',
  'mushroom-10',
  'apple-10',
  'tree-10',
  'pear-10',
  'carrot-10',
  'leaf-10',
  'tulip-10',
  'snail-10',
  'strawberry-10',
  'bird-10',
  'ladybird-10',
  'penguin-10',
  'cupcake-10',
  'watermelon-10',
  'bee-10',
  'teapot-10',
  'crab-10',
  'whale-10',
  'sunflower-10',
  'pineapple-10',

  // ---------- 15 × 15 ----------
  'fish-15',
  'sailboat-15',
  'mushroom-15',
  'house-15',
  'owl-15',
  'fir-15',
  'grapes-15',
  'pear-15',
  'fox-15',
  'frog-15',
  'car-15',
  'hedgehog-15',
  'turtle-15',
  'elephant-15',
  'palm-15',
];

/** The colour section's pictures in its order (an id the album lacks is left out; the test says so). */
export const COLOUR_PICTURES: readonly Picture[] = COLOUR_IDS.flatMap((id) => PICTURES.filter((p) => p.id === id));
