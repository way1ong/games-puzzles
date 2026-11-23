// The shared style sheet takes every colour from the game's tokens.
import { expect, it } from 'vitest';
import ui from './ui.css?raw';

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;

it('keeps colours out of shared/styles/ui.css', () => {
  expect(ui.split('\n').find((l) => COLOUR.test(l))).toBeUndefined();
});
