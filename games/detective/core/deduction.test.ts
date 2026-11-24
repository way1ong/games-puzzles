// Deduction: what rules a suspect out, false leads, and what makes a harder case a fair puzzle.
import { describe, expect, it } from 'vitest';
import { STORIES, at, type CaseDef } from './cases.ts';
import { atFaceValue, bestProof, candidates, check, clashes, excludedBy, falseLeads, leftBy, prove, puzzleProblems, reasonsOf, statementsHold, visitors } from './deduction.ts';
import { alibis, awayAt, hasKey, visitOf } from './facts.ts';

const def = STORIES.recipeBook;
// emma 0 · sofia 1 · viktor 2 (did it) · lina 3 (the florist) · pavlo 4 · tamas 5
const [EMMA, SOFIA, VIKTOR, LINA, PAVLO, TAMAS] = [0, 1, 2, 3, 4, 5] as const;

describe('facts', () => {
  it('a key, a visit, an alibi', () => {
    expect(hasKey(def.facts[EMMA] ?? [])).toBe(true);
    expect(hasKey(def.facts[SOFIA] ?? [])).toBe(false);
    expect(visitOf(def.facts[LINA] ?? [])).toBe('flowers');
    expect(visitOf(def.facts[EMMA] ?? [])).toBeNull();
    expect(alibis(def.facts[PAVLO] ?? [])).toHaveLength(1);
  });

  it('an alibi covers its whole time, ends included, and nothing else', () => {
    const facts = def.facts[PAVLO] ?? [];
    expect(awayAt(facts, at(21))?.where).toBe('mailSorting');
    expect(awayAt(facts, at(21, 40))).not.toBeNull();
    expect(awayAt(facts, at(22, 30))).not.toBeNull();
    expect(awayAt(facts, at(20, 59))).toBeNull();
    expect(awayAt(facts, at(22, 31))).toBeNull();
  });
});

describe('the reasons of the medium case', () => {
  it('are the circumstances, then the evidence', () => {
    expect(reasonsOf(def)).toEqual(['locked', 'time', 'hair:dark', 'buttons:brown', 'flower']);
  });

  it('the lock rules out whoever has no key', () => {
    expect(check(def, SOFIA, 'locked')).toEqual({ excludes: true });
    expect(check(def, LINA, 'locked')).toEqual({ excludes: true });
    expect(check(def, VIKTOR, 'locked')).toEqual({ excludes: false, why: 'hasKey' });
  });

  it('the time rules out whoever was seen elsewhere then', () => {
    expect(check(def, PAVLO, 'time')).toEqual({ excludes: true });
    expect(check(def, TAMAS, 'time')).toEqual({ excludes: false, why: 'free' });
  });

  it('evidence rules out whoever it does not fit', () => {
    expect(check(def, EMMA, 'hair:dark')).toEqual({ excludes: true });
    expect(check(def, TAMAS, 'buttons:brown')).toEqual({ excludes: true });
    expect(check(def, VIKTOR, 'hair:dark')).toEqual({ excludes: false, why: 'fits' });
  });

  it('the petal is a false lead: the florist could have left it by day, so it rules out nobody', () => {
    expect(visitors(def)).toEqual([LINA]);
    expect(falseLeads(def)).toEqual([{ clue: 'flower', visitor: LINA }]);
    expect(leftBy(def, 'flower', VIKTOR)).toBe(LINA);
    expect(check(def, VIKTOR, 'flower')).toEqual({ excludes: false, why: 'visitor', visitor: LINA });
    expect(check(def, EMMA, 'flower')).toEqual({ excludes: false, why: 'visitor', visitor: LINA });
    // it fits the florist herself and Sofia
    expect(check(def, LINA, 'flower')).toEqual({ excludes: false, why: 'fits' });
    expect(check(def, SOFIA, 'flower')).toEqual({ excludes: false, why: 'fits' });
    // the other evidence nobody but the one who did it could leave
    expect(leftBy(def, 'hair:dark', VIKTOR)).toBeNull();
  });

  it('everybody but one is ruled out, each for a reason of their own kind', () => {
    expect(candidates(def)).toEqual([VIKTOR]);
    expect(excludedBy(def, SOFIA)).toEqual(['locked']);
    expect(excludedBy(def, PAVLO)).toEqual(['time']);
    expect(excludedBy(def, EMMA)).toEqual(['hair:dark']);
    expect(excludedBy(def, TAMAS)).toEqual(['buttons:brown']);
    expect(excludedBy(def, LINA)).toEqual(['locked', 'hair:dark', 'buttons:brown']);
    expect(excludedBy(def, VIKTOR)).toEqual([]);
  });

  it('a hasty reader, matching all the evidence, names the wrong person', () => {
    expect(atFaceValue(def)).toEqual([SOFIA]);
  });

  it('throws on a suspect or a circumstance the case does not have', () => {
    expect(() => check(def, 9, 'locked')).toThrow();
    expect(() => check(STORIES.lostLetter, 0, 'locked')).toThrow();
  });
});

describe('a fair puzzle', () => {
  const broken = (change: (c: CaseDef) => void): string[] => {
    const copy = structuredClone(def) as CaseDef;
    change(copy);
    return puzzleProblems(copy);
  };

  it('every story is one', () => {
    for (const story of Object.values(STORIES)) expect(puzzleProblems(story), story.id).toEqual([]);
  });

  it('two people left, or the wrong one', () => {
    expect(broken((c) => ((c.suspects[TAMAS] as (typeof c.suspects)[number]).buttons = 'brown')).join()).toContain('leave [2,5]');
    expect(broken((c) => (c.culprit = SOFIA)).join()).toContain('not only the one who did it');
  });

  it('a reason nobody needs', () => {
    // in gold buttons Sofia is ruled out by the evidence too — and the lock then rules out nobody the evidence does not
    expect(broken((c) => (c.suspects[SOFIA] = { person: 'sofia', buttons: 'gold', scarf: 'blue', flower: true })).join()).toContain('"locked" is not needed');
  });

  it('no false lead, or a false lead that misleads nobody', () => {
    expect(broken((c) => (c.facts[LINA] = [])).join()).toContain('needs a false lead');
    expect(broken((c) => ((c.suspects[VIKTOR] as (typeof c.suspects)[number]).flower = true)).join()).toContain('misleads nobody');
    expect(broken((c) => ((c.suspects[SOFIA] as (typeof c.suspects)[number]).flower = false)).join()).toContain('at face value');
  });

  it('a watch that is not in the room, an alibi backwards, facts in an easy case', () => {
    expect(broken((c) => (c.things = c.things.filter((p) => p.thing !== 'watch'))).join()).toContain('not among the things');
    expect(broken((c) => (c.facts[PAVLO] = [{ kind: 'key' }, { kind: 'away', from: at(23), to: at(21), where: 'mailSorting' }])).join()).toContain('ends before it starts');
    const easy = structuredClone(STORIES.lostLetter) as CaseDef;
    easy.facts = [[{ kind: 'key' }]];
    expect(puzzleProblems(easy).join()).toContain('an easy case has no circumstances and no facts');
  });
});

describe('the hard case: statements', () => {
  const hard = STORIES.missingStamp;
  // anna 0 · sofia 1 · ilona 2 (the librarian) · tamas 3 (did it) · nora 4 · viktor 5
  const [ANNA, SOFIA2, ILONA, TAMAS2, NORA, VIKTOR2] = [0, 1, 2, 3, 4, 5] as const;
  const all = [0, 1, 2, 3, 4, 5];

  it('the reasons end with a statement of everybody', () => {
    expect(reasonsOf(hard)).toEqual(['time', 'glasses', 'buttons:gold', 'scarf:blue', 'say:0', 'say:1', 'say:2', 'say:3', 'say:4', 'say:5']);
  });

  it('everybody else can be telling the truth only if Tamas or the librarian did it', () => {
    expect(all.filter((c) => statementsHold(hard, c, all))).toEqual([ILONA, TAMAS2]);
    expect(clashes(hard)).toEqual([[ILONA, TAMAS2]]);
  });

  it('a statement gives an alibi to the person it places elsewhere', () => {
    expect(prove(hard, NORA, ['say:2'])).toEqual({ excludes: true, by: 'vouched', speaker: ILONA });
    expect(prove(hard, NORA, ['say:3'])).toEqual({ excludes: true, by: 'vouched', speaker: TAMAS2 }); // true or not, it is his word
    expect(prove(hard, ANNA, ['say:2'])).toEqual({ excludes: false, why: 'possible' });
    expect(prove(hard, NORA, ['say:4'])).toEqual({ excludes: false, why: 'own' });
  });

  it('two statements that cannot both be true rule out everybody but those two', () => {
    for (const other of [ANNA, SOFIA2, NORA, VIKTOR2]) expect(prove(hard, other, ['say:2', 'say:3']).excludes, String(other)).toBe(true);
    expect(prove(hard, ANNA, ['say:2', 'say:3'])).toEqual({ excludes: true, by: 'clash', a: ILONA, b: TAMAS2 });
    expect(prove(hard, ILONA, ['say:2', 'say:3'])).toEqual({ excludes: false, why: 'own' });
    expect(prove(hard, TAMAS2, ['say:2', 'say:3'])).toEqual({ excludes: false, why: 'own' });
    expect(prove(hard, ANNA, ['say:4', 'say:5'])).toEqual({ excludes: false, why: 'possible' });
  });

  it('evidence decides between the two: the gold button is not the librarian’s', () => {
    expect(atFaceValue(hard)).toEqual([ANNA, TAMAS2, NORA]);
    expect(prove(hard, ILONA, ['buttons:gold'])).toEqual({ excludes: true, by: 'reason', reason: 'buttons:gold' });
    expect(prove(hard, ILONA, ['glasses', 'buttons:gold']).excludes).toBe(true);
    expect(candidates(hard)).toEqual([TAMAS2]);
    expect(excludedBy(hard, TAMAS2)).toEqual([]);
    expect(bestProof(hard, TAMAS2)).toBeNull();
    expect(bestProof(hard, ANNA)).toEqual(['say:2', 'say:3']);
    expect(bestProof(hard, NORA)).toEqual(['say:2']);
  });

  it('is a fair puzzle, and stops being one when broken', () => {
    const broken = (change: (c: CaseDef) => void): string => {
      const copy = structuredClone(hard) as CaseDef;
      change(copy);
      return puzzleProblems(copy).join();
    };
    expect(puzzleProblems(hard)).toEqual([]);
    // the librarian no longer contradicts Tamas: nothing tells him from Anna
    expect(broken((c) => (c.statements[ILONA] = { at: 'library', saw: [NORA] }))).toContain('leave [0,3]');
    // the librarian in gold buttons: the evidence no longer tells her from Tamas
    expect(broken((c) => ((c.suspects[ILONA] as (typeof c.suspects)[number]).buttons = 'gold'))).toContain('leave [2,3]');
    expect(broken((c) => c.statements.pop())).toContain('a statement from every suspect');
    expect(broken((c) => (c.circumstances = []))).toContain('needs the time');
    expect(broken((c) => (c.statements[ANNA] = { at: 'home', saw: [ANNA] }))).toContain('about themselves');
    // somebody saw Anna too: then the evidence is all one needs… and the lens rules out nobody new
    expect(broken((c) => (c.suspects[SOFIA2] = { person: 'viktor', buttons: 'gold', scarf: 'red', flower: false }))).toContain('"glasses" rules out nobody');
    const medium = structuredClone(STORIES.recipeBook) as CaseDef;
    medium.statements = [{ at: 'home' }];
    expect(puzzleProblems(medium).join()).toContain('only a hard case has statements');
  });
});
