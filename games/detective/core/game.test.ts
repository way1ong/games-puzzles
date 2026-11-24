import { describe, expect, it } from 'vitest';
import { STORIES } from './cases.ts';
import { searchCase } from './daily.ts';
import {
  accuse,
  allFound,
  begin,
  canAccuse,
  eliminations,
  evidenceCount,
  foundClues,
  hint,
  isEvidence,
  newProgress,
  reasonsAtOnce,
  regionOf,
  remaining,
  restore,
  rule,
  solution,
  toSuspects,
  toggleRuledOut,
  touch,
  tries,
  type Progress,
} from './game.ts';
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
    const aside = toggleRuledOut(def, ready, 3);
    expect(aside.ruledOut).toEqual([3]);
    expect(toggleRuledOut(def, aside, 3).ruledOut).toEqual([]);
    expect(toggleRuledOut(def, begin(newProgress(def)), 3).ruledOut).toEqual([]); // not in the room
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

describe('a harder case: who did it, with reasons', () => {
  const medium = STORIES.recipeBook;
  // emma 0 · sofia 1 · viktor 2 (did it) · lina 3 · pavlo 4 · tamas 5
  let ready = begin(newProgress(medium));
  for (const { thing } of medium.things) ready = { ...ready, found: [...ready.found, thing] };
  ready = toSuspects(medium, ready);

  it('counts the stopped watch as evidence', () => {
    expect(isEvidence(medium, 'watch')).toBe(true);
    expect(isEvidence(medium, 'coin')).toBe(false);
    expect(isEvidence(STORIES.fairPie, 'watch')).toBe(false);
    expect(evidenceCount(medium)).toBe(4);
    expect(evidenceCount(STORIES.fairPie)).toBe(3);
  });

  it('nobody is set aside without a reason, and nobody is named before the rest are set aside', () => {
    expect(ready.stage).toBe('suspects');
    expect(toggleRuledOut(medium, ready, 0)).toBe(ready);
    expect(canAccuse(medium, ready, 2)).toBe(false);
    expect(accuse(medium, ready, 2).progress).toBe(ready);
    expect(accuse(medium, ready, 1).progress).toBe(ready);
  });

  it('a reason that holds sets the person aside; one that does not is a slip', () => {
    const slip = rule(medium, ready, 1, 'flower'); // the petal fits Sofia
    expect(slip.check).toEqual({ excludes: false, why: 'fits' });
    expect(slip.progress.ruledOut).toEqual([]);
    expect(slip.progress.slips).toBe(1);
    const lead = rule(medium, slip.progress, 0, 'flower'); // the florist's petal proves nothing about Emma
    expect(lead.check).toEqual({ excludes: false, why: 'visitor', visitor: 3 });
    expect(lead.progress.slips).toBe(2);
    const sofia = rule(medium, lead.progress, 1, 'locked');
    expect(sofia.check).toEqual({ excludes: true, by: 'reason', reason: 'locked' });
    expect(sofia.progress.ruledOut).toEqual([1]);
    expect(sofia.progress.reasons).toEqual({ 1: ['locked'] });
    expect(sofia.progress.slips).toBe(2);
    // set aside for good: no second ruling, no bringing back
    expect(rule(medium, sofia.progress, 1, 'locked')).toEqual({ progress: sofia.progress, check: null });
    expect(toggleRuledOut(medium, sofia.progress, 1)).toBe(sofia.progress);
  });

  it('nothing rules out the one who did it; with the rest aside they are named, and the case is solved', () => {
    let p = ready;
    for (const reason of ['locked', 'time', 'hair:dark', 'buttons:brown', 'flower'] as const) p = rule(medium, p, 2, reason).progress;
    expect(p.ruledOut).toEqual([]);
    expect(p.slips).toBe(5);
    for (const { suspect, picked } of eliminations(medium)) p = rule(medium, p, suspect, picked).progress;
    expect(eliminations(medium)).toEqual([
      { suspect: 0, picked: ['hair:dark'] },
      { suspect: 1, picked: ['locked'] },
      { suspect: 3, picked: ['locked'] },
      { suspect: 4, picked: ['time'] },
      { suspect: 5, picked: ['buttons:brown'] },
    ]);
    expect(remaining(medium, p)).toEqual([2]);
    expect(canAccuse(medium, p, 2)).toBe(true);
    expect(canAccuse(medium, p, 1)).toBe(false);
    const verdict = accuse(medium, p, 2);
    expect(verdict.correct).toBe(true);
    expect(verdict.progress.stage).toBe('solved');
    expect(tries(verdict.progress)).toBe(1);
  });

  it('rules on nothing outside the suspects stage, in an easy case, or for a reason the case does not have', () => {
    expect(rule(medium, begin(newProgress(medium)), 1, 'locked').check).toBeNull();
    expect(rule(medium, ready, 9, 'locked').check).toBeNull();
    expect(rule(medium, ready, 1, 'glasses').check).toBeNull();
    expect(rule(medium, ready, 1, ['locked', 'time']).check).toBeNull(); // one reason at a time on the medium level
    expect(rule(medium, ready, 1, []).check).toBeNull();
    const easy = toSuspects(def, findAll(begin(newProgress(def))));
    expect(rule(def, easy, 0, 'buttons:blue')).toEqual({ progress: easy, check: null });
    expect(canAccuse(def, easy, 0)).toBe(true);
  });

  it('a saved game keeps only people set aside for a reason that holds', () => {
    const p = rule(medium, rule(medium, ready, 1, 'locked').progress, 4, 'time').progress;
    expect(restore(medium, JSON.parse(JSON.stringify(p)))).toEqual(p);
    // a reason alone (the save of the first medium level) is taken as a list of one
    const forged = { ...p, ruledOut: [1, 4, 2, 0], reasons: { 1: 'locked', 4: ['hair:dark'], 2: ['locked'], 0: ['hair:dark', 'locked'] }, slips: 2.7, wrong: [3] };
    expect(restore(medium, JSON.parse(JSON.stringify(forged)))).toMatchObject({ ruledOut: [1], reasons: { 1: ['locked'] }, slips: 2, wrong: [] });
    // a save from before the levels: no reasons, no slips
    const { reasons: _r, slips: _s, ...old } = toSuspects(def, findAll(begin(newProgress(def))));
    expect(restore(def, old)).toMatchObject({ reasons: {}, slips: 0, stage: 'suspects' });
  });
});

describe('a hard case: statements, and only the one who did it lies', () => {
  const hard = STORIES.missingStamp;
  // anna 0 · sofia 1 · ilona 2 (the librarian) · tamas 3 (did it) · nora 4 · viktor 5
  let ready = begin(newProgress(hard));
  for (const { thing } of hard.things) ready = { ...ready, found: [...ready.found, thing] };
  ready = toSuspects(hard, ready);

  it('takes two reasons at once, and no more', () => {
    expect(reasonsAtOnce(hard)).toBe(2);
    expect(reasonsAtOnce(STORIES.recipeBook)).toBe(1);
    expect(rule(hard, ready, 0, ['say:2', 'say:3', 'say:4']).check).toBeNull();
    expect(rule(hard, ready, 0, ['say:9']).check).toBeNull();
  });

  it('a statement that gives an alibi, two statements that clash, evidence — each sets a person aside', () => {
    const nora = rule(hard, ready, 4, 'say:2'); // the librarian saw Nora in the reading room
    expect(nora.check).toEqual({ excludes: true, by: 'vouched', speaker: 2 });
    const anna = rule(hard, nora.progress, 0, ['say:3', 'say:2']); // Tamas and the librarian cannot both be right
    expect(anna.check).toEqual({ excludes: true, by: 'clash', a: 3, b: 2 });
    expect(anna.progress.reasons).toEqual({ 4: ['say:2'], 0: ['say:3', 'say:2'] });
    const ilona = rule(hard, anna.progress, 2, 'buttons:gold');
    expect(ilona.check).toEqual({ excludes: true, by: 'reason', reason: 'buttons:gold' });
    expect(ilona.progress.slips).toBe(0);
  });

  it('a slip: a statement alone, their own statement, evidence that fits', () => {
    expect(rule(hard, ready, 0, 'say:2')).toMatchObject({ check: { excludes: false, why: 'possible' }, progress: { slips: 1 } });
    expect(rule(hard, ready, 0, 'say:0').check).toEqual({ excludes: false, why: 'own' });
    expect(rule(hard, ready, 0, 'glasses').check).toEqual({ excludes: false, why: 'fits' });
    // nothing rules out the one who did it — not even the librarian's word against his
    expect(rule(hard, ready, 3, ['say:2', 'say:3']).check).toEqual({ excludes: false, why: 'own' });
    expect(rule(hard, ready, 3, ['say:2', 'say:4']).check).toEqual({ excludes: false, why: 'possible' });
  });

  it('is solved by setting everybody else aside', () => {
    let p = ready;
    for (const { suspect, picked } of eliminations(hard)) p = rule(hard, p, suspect, picked).progress;
    expect(eliminations(hard)).toEqual([
      { suspect: 0, picked: ['say:2', 'say:3'] },
      { suspect: 1, picked: ['glasses'] },
      { suspect: 2, picked: ['buttons:gold'] },
      { suspect: 4, picked: ['say:2'] },
      { suspect: 5, picked: ['scarf:blue'] },
    ]);
    expect(remaining(hard, p)).toEqual([3]);
    expect(accuse(hard, p, 3).correct).toBe(true);
    expect(restore(hard, JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});
