import { describe, expect, it } from 'vitest';
import { STORIES } from './cases.ts';
import { searchCase } from './daily.ts';
import { accuse, allFound, begin, foundClues, hint, newProgress, regionOf, restore, solution, toSuspects, toggleRuledOut, touch, tries, type Progress } from './game.ts';
import { sizeOf } from './things.ts';

const def = STORIES.lostLetter;
const middle = (thing: string) => {
  const p = def.things.find((t) => t.thing === thing);
  if (!p) throw new Error(`No ${thing}`);
  return { x: p.x, y: p.y - sizeOf(p.thing).h / 2 };
};
const touchThing = (progress: Progress, thing: string) => touch(def, progress, middle(thing).x, middle(thing).y, 0);
const findAll = (progress: Progress) => def.things.reduce((p, t) => touchThing(p, t.thing).progress, progress);

describe('looking over the room', () => {
  it('starts with the story, then the room', () => {
    const start = newProgress(def);
    expect(start.stage).toBe('intro');
    expect(touchThing(start, 'key').found).toBeNull(); // not in the room yet
    expect(begin(start).stage).toBe('search');
  });

  it('finds a thing by a touch on it, once; a touch elsewhere finds nothing', () => {
    const start = begin(newProgress(def));
    const first = touchThing(start, 'key');
    expect(first.found?.thing).toBe('key');
    expect(first.progress.found).toEqual(['key']);
    expect(start.found).toEqual([]); // the old state is not changed
    expect(touchThing(first.progress, 'key').found).toBeNull();
    expect(touch(def, start, 600, 400, 5).found).toBeNull();
  });

  it('counts the tolerance around a thing', () => {
    const start = begin(newProgress(def));
    const { x, y } = middle('coin');
    const edge = sizeOf('coin').w / 2;
    expect(touch(def, start, x + edge + 15, y, 16).found?.thing).toBe('coin');
    expect(touch(def, start, x + edge + 17, y, 16).found).toBeNull();
  });

  it('keeps the evidence found, in the order of finding', () => {
    let p = begin(newProgress(def));
    p = touchThing(p, 'glasses').progress;
    p = touchThing(p, 'key').progress;
    p = touchThing(p, 'hair:red').progress;
    expect(foundClues(p)).toEqual(['glasses', 'hair:red']);
  });

  it('hints at the first thing of the list not found yet and counts the hints', () => {
    let p = begin(newProgress(def));
    const first = hint(def, p);
    expect(first.thing?.thing).toBe(def.things[0]?.thing);
    expect(first.progress.hints).toBe(1);
    p = touchThing(first.progress, def.things[0]?.thing as string).progress;
    const second = hint(def, p);
    expect(second.thing?.thing).toBe(def.things[1]?.thing);
    expect(second.progress.hints).toBe(2);
    const done = findAll(p);
    expect(hint(def, done)).toEqual({ progress: done, thing: null });
  });

  it('goes to the suspects only when everything is found', () => {
    const part = touchThing(begin(newProgress(def)), 'key').progress;
    expect(allFound(def, part)).toBe(false);
    expect(toSuspects(def, part).stage).toBe('search');
    const done = findAll(begin(newProgress(def)));
    expect(allFound(def, done)).toBe(true);
    expect(done.stage).toBe('search');
    expect(toSuspects(def, done).stage).toBe('suspects');
  });
});

describe('who did it', () => {
  const ready = toSuspects(def, findAll(begin(newProgress(def))));

  it('sets a suspect aside and brings them back', () => {
    const aside = toggleRuledOut(ready, 3);
    expect(aside.ruledOut).toEqual([3]);
    expect(toggleRuledOut(aside, 3).ruledOut).toEqual([]);
    expect(toggleRuledOut(begin(newProgress(def)), 3).ruledOut).toEqual([]); // not in the room
  });

  it('a wrong name: says which evidence does not fit, sets the person aside, lets try again', () => {
    const anna = accuse(def, ready, 0);
    expect(anna.correct).toBe(false);
    expect(anna.mismatch).toBe('buttons:blue');
    expect(anna.progress.stage).toBe('suspects');
    expect(anna.progress.wrong).toEqual([0]);
    expect(anna.progress.ruledOut).toEqual([0]);
    const again = accuse(def, anna.progress, 0);
    expect(again.progress.wrong).toEqual([0]); // the same wrong name is counted once
    const lina = accuse(def, again.progress, 5);
    expect(lina.mismatch).toBe('glasses');
    const marta = accuse(def, lina.progress, def.culprit);
    expect(marta.correct).toBe(true);
    expect(marta.progress.stage).toBe('solved');
    expect(tries(marta.progress)).toBe(3);
  });

  it('the right name at once solves the case on the first try', () => {
    const verdict = accuse(def, ready, def.culprit);
    expect(verdict).toMatchObject({ correct: true, mismatch: null });
    expect(tries(verdict.progress)).toBe(1);
  });

  it('nobody can be named before the room is looked over', () => {
    const early = accuse(def, begin(newProgress(def)), def.culprit);
    expect(early.correct).toBe(false);
    expect(early.progress.stage).toBe('search');
  });

  it('explains every piece of evidence at the end', () => {
    expect(solution(def)).toEqual([
      { clue: 'hair:red', who: [0, 2, 5] },
      { clue: 'buttons:blue', who: [1, 2, 5] },
      { clue: 'glasses', who: [0, 1, 2] },
    ]);
  });
});

describe('free search', () => {
  it('has no story and ends with the last thing found', () => {
    const search = searchCase('study', 'day', 5);
    let p = newProgress(search, 5);
    expect(p.stage).toBe('search');
    for (const t of search.things) {
      expect(p.stage).toBe('search');
      p = touch(search, p, t.x, t.y - sizeOf(t.thing).h / 2, 0).progress;
    }
    expect(p.stage).toBe('solved');
    expect(toSuspects(search, p).stage).toBe('solved');
  });
});

describe('a saved game', () => {
  it('comes back as it was', () => {
    const p = touchThing(begin(newProgress(def)), 'key').progress;
    expect(restore(def, JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('of another case, of another format or broken is not taken', () => {
    const p = begin(newProgress(def));
    expect(restore(STORIES.midnightCall, p)).toBeNull();
    expect(restore(def, { ...p, version: 2 })).toBeNull();
    expect(restore(def, { ...p, stage: 'flying' })).toBeNull();
    expect(restore(def, { ...p, found: 'key' })).toBeNull();
    expect(restore(def, null)).toBeNull();
    expect(restore(def, 'text')).toBeNull();
  });

  it('drops what the case no longer has and does not skip the room', () => {
    const p = { ...begin(newProgress(def)), found: ['key', 'key', 'umbrella'], wrong: [0, 9], ruledOut: [-1, 2], hints: 2.5 };
    expect(restore(def, p)).toMatchObject({ found: ['key'], wrong: [0], ruledOut: [2], hints: 2 });
    expect(restore(def, { ...p, stage: 'suspects' })?.stage).toBe('search');
    expect(restore(def, { ...p, stage: 'solved' })?.stage).toBe('search');
  });
});

it('names the ninth of the room for a hint in words', () => {
  expect(regionOf(10, 10)).toBe('topLeft');
  expect(regionOf(600, 400)).toBe('middle');
  expect(regionOf(1190, 790)).toBe('bottomRight');
  expect(regionOf(1190, 300)).toBe('right');
  expect(regionOf(500, 700)).toBe('bottom');
  expect(regionOf(-5, 900)).toBe('bottomLeft');
});
