import { describe, expect, it } from 'vitest';
import { isWordOf, plain, tileCount, tilesOf } from './letters.ts';

const ON = { huTiles: true };
const OFF = { huTiles: false };

describe('letters and tiles', () => {
  it('keeps to the letters of each language', () => {
    expect(isWordOf('en', 'cat')).toBe(true);
    expect(isWordOf('en', "cat's")).toBe(false);
    expect(isWordOf('uk', 'їжак')).toBe(true);
    expect(isWordOf('uk', 'м’ясо')).toBe(false); // the apostrophe is not a letter of the wheel
    expect(isWordOf('uk', 'cat')).toBe(false);
    expect(isWordOf('hu', 'ház|tető')).toBe(true);
    expect(isWordOf('hu', '|ház')).toBe(false);
  });

  it('makes two-character Hungarian letters one tile only when asked', () => {
    expect(tilesOf('hu', 'asszony', ON)).toEqual(['a', 's', 'sz', 'o', 'ny']);
    expect(tilesOf('hu', 'asszony', OFF)).toEqual([...'asszony']);
    expect(tilesOf('hu', 'bodza', ON)).toEqual(['b', 'o', 'd', 'z', 'a']); // dz stays two letters
    expect(tilesOf('hu', 'dzsungel', ON)).toEqual(['d', 'zs', 'u', 'n', 'g', 'e', 'l']);
    expect(tilesOf('en', 'sz', ON)).toEqual(['s', 'z']);
  });

  it('never joins two letters across a compound boundary', () => {
    expect(tilesOf('hu', 'ház|sor', ON)).toEqual(['h', 'á', 'z', 's', 'o', 'r']);
    expect(tilesOf('hu', 'házsor', ON)).toEqual(['h', 'á', 'zs', 'o', 'r']);
    expect(plain('ház|sor')).toBe('házsor');
    expect(tileCount('hu', 'ház|tető', ON)).toBe(7);
  });
});
