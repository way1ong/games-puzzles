import { describe, expect, it } from 'vitest';
import { typeKey, type Typing } from './typing.ts';

/** The tiles picked after typing the keys one by one. */
function typed(wheel: string[], keys: string): string[] {
  let typing: Typing = { selected: [], pending: null };
  for (const key of keys) typing = typeKey(wheel, typing, key);
  return typing.selected.map((i) => wheel[i]!);
}

describe('making a word with the keys', () => {
  it('picks a free tile for each key, never one tile twice, and skips keys not on the wheel', () => {
    expect(typed(['п', 'л', 'а', 'н'], 'план')).toEqual(['п', 'л', 'а', 'н']);
    expect(typed(['a', 'n', 'n', 'a'], 'anna')).toEqual(['a', 'n', 'n', 'a']);
    expect(typed(['a', 'n'], 'anna')).toEqual(['a', 'n']);
    expect(typed(['a', 'b'], 'xay')).toEqual(['a']);
  });

  it('types a Hungarian two-character tile with its two keys', () => {
    expect(typed(['k', 'o', 'cs', 'i'], 'kocsi')).toEqual(['k', 'o', 'cs', 'i']);
    expect(typed(['gy', 'á', 'r'], 'gyár')).toEqual(['gy', 'á', 'r']);
  });

  it('lets the first key’s own tile give way to the pair when the wheel has both (s and sz)', () => {
    const wheel = ['sz', 'a', 'm', 'r', 's'];
    expect(typed(wheel, 'szam')).toEqual(['sz', 'a', 'm']);
    expect(typed(wheel, 'sas')).toEqual(['s', 'a']);
    expect(typed(wheel, 'masz')).toEqual(['m', 'a', 'sz']);
    // The second key without a pair to make is a letter of its own.
    expect(typed(wheel, 'sa')).toEqual(['s', 'a']);
  });

  it('does nothing for a key that neither picks a tile nor begins one', () => {
    const typing: Typing = { selected: [0], pending: null };
    expect(typeKey(['a', 'b'], typing, 'q')).toBe(typing);
  });
});
