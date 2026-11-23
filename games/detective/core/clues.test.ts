import { describe, expect, it } from 'vitest';
import { explain, fairness, firstMismatch, fitting, isFair } from './clues.ts';
import { ALL_CLUES, cluesOf, fits, type ClueId, type Traits } from './traits.ts';

const person = (over: Partial<Traits> = {}): Traits => ({ hair: 'dark', glasses: false, buttons: 'brown', scarf: null, flower: false, ...over });

describe('evidence and traits', () => {
  it('fits a clue only to the trait it points at', () => {
    const marta = person({ hair: 'red', glasses: true, buttons: 'blue', scarf: 'red' });
    expect(fits(marta, 'hair:red')).toBe(true);
    expect(fits(marta, 'hair:dark')).toBe(false);
    expect(fits(marta, 'glasses')).toBe(true);
    expect(fits(marta, 'buttons:blue')).toBe(true);
    expect(fits(marta, 'buttons:gold')).toBe(false);
    expect(fits(marta, 'scarf:red')).toBe(true);
    expect(fits(marta, 'scarf:yellow')).toBe(false);
    expect(fits(marta, 'flower')).toBe(false);
    expect(fits(person({ flower: true }), 'flower')).toBe(true);
  });

  it('a person leaves only what they have: no scarf — no thread, no flower — no petal', () => {
    const plain = person();
    expect(ALL_CLUES.filter((c) => c.startsWith('scarf')).some((c) => fits(plain, c))).toBe(false);
    expect(cluesOf(plain)).toEqual(['hair:dark', 'buttons:brown']);
    expect(cluesOf(person({ glasses: true, scarf: 'blue', flower: true }))).toEqual(['hair:dark', 'glasses', 'buttons:brown', 'scarf:blue', 'flower']);
  });
});

describe('a fair puzzle', () => {
  const clues: ClueId[] = ['hair:red', 'buttons:blue', 'glasses'];
  const fair = [
    person({ hair: 'red', glasses: true }), // no blue buttons
    person({ glasses: true, buttons: 'blue' }), // hair not red
    person({ hair: 'red', glasses: true, buttons: 'blue' }), // the one
    person({ hair: 'blond' }),
    person({ hair: 'red', buttons: 'blue' }), // no glasses
  ];

  it('leaves exactly one suspect, and needs every clue', () => {
    expect(fitting(fair, clues)).toEqual([2]);
    expect(fairness(fair, clues)).toEqual({ fit: [2], needless: [] });
    expect(isFair(fair, clues, 2)).toBe(true);
    expect(isFair(fair, clues, 0)).toBe(false);
  });

  it('is not fair when two suspects fit', () => {
    const two = [...fair, person({ hair: 'red', glasses: true, buttons: 'blue', flower: true })];
    expect(fitting(two, clues)).toEqual([2, 5]);
    expect(isFair(two, clues, 2)).toBe(false);
  });

  it('is not fair when nobody fits', () => {
    expect(isFair(fair.filter((_, i) => i !== 2), clues, 2)).toBe(false);
  });

  it('is not fair when a clue is not needed', () => {
    // nobody else has both red hair and glasses: the button decides nothing
    const loose = fair.map((t, i) => (i === 0 ? person({ hair: 'red' }) : t));
    expect(fitting(loose, clues)).toEqual([2]);
    expect(fairness(loose, clues).needless).toEqual(['buttons:blue']);
    expect(isFair(loose, clues, 2)).toBe(false);
  });

  it('is not fair with the same clue twice', () => {
    expect(isFair(fair, ['hair:red', 'hair:red', 'buttons:blue', 'glasses'], 2)).toBe(false);
  });

  it('says which clue does not fit a wrong suspect, and who fits each clue', () => {
    expect(firstMismatch(fair[0] as Traits, clues)).toBe('buttons:blue');
    expect(firstMismatch(fair[3] as Traits, clues)).toBe('hair:red');
    expect(firstMismatch(fair[2] as Traits, clues)).toBeNull();
    expect(explain(fair, clues)).toEqual([
      { clue: 'hair:red', who: [0, 2, 4] },
      { clue: 'buttons:blue', who: [1, 2, 4] },
      { clue: 'glasses', who: [0, 1, 2] },
    ]);
  });
});
