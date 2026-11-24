// Hand-made cases: the right numbers of things, evidence and suspects, a fair puzzle, things on real places.
import { describe, expect, it } from 'vitest';
import { DETECTIVE } from '../config.ts';
import { STORIES, STORY_IDS } from './cases.ts';
import { fairness } from './clues.ts';
import { puzzleProblems } from './deduction.ts';
import { evidenceCount } from './game.ts';
import { traitsOf } from './people.ts';
import { placementProblems } from './placement.ts';
import { ROOM_IDS, SPOTS } from './rooms.ts';
import { isClue } from './traits.ts';

describe.each(STORY_IDS)('the case %s', (id) => {
  const def = STORIES[id];

  it('is named as it is listed and is a story', () => {
    expect(def.id).toBe(id);
    expect(def.story).toBe(id);
    expect(def.kind).toBe('story');
  });

  it('has the numbers of the rules', () => {
    expect(def.things.length).toBe(DETECTIVE.thingsPerScene);
    expect(def.clues.length).toBe(DETECTIVE.cluesPerCase);
    expect(def.suspects.length).toBe(DETECTIVE.suspectsPerCase);
    expect(new Set(def.suspects.map((s) => s.person)).size).toBe(def.suspects.length);
  });

  it('hides exactly its evidence among the things', () => {
    expect(def.things.map((p) => p.thing).filter(isClue).sort()).toEqual([...def.clues].sort());
  });

  it('is a fair puzzle: one answer, every reason needed', () => {
    expect(puzzleProblems(def)).toEqual([]);
    // an easy case is the old rule too: all the evidence fits one person, and each piece is needed
    if (def.level === 'easy') expect(fairness(def.suspects.map(traitsOf), def.clues)).toEqual({ fit: [def.culprit], needless: [] });
  });

  it('a harder case has more evidence than traits to match: the thing a circumstance rests on', () => {
    expect(evidenceCount(def)).toBe(def.clues.length + def.circumstances.filter((c) => c.kind === 'time').length);
    expect(def.facts.length).toBe(def.level === 'medium' ? def.suspects.length : 0);
    expect(def.statements.length).toBe(def.level === 'hard' ? def.suspects.length : 0);
  });

  it('keeps every thing on a place of the room', () => {
    expect(placementProblems(def.things, SPOTS[def.room])).toEqual([]);
  });
});

it('every room has an easy case by day and an easy case at night, and they come first', () => {
  const easy = STORY_IDS.filter((id) => STORIES[id].level === 'easy');
  for (const room of ROOM_IDS) {
    expect(easy.filter((id) => STORIES[id].room === room).map((id) => STORIES[id].time)).toEqual(['day', 'night']);
  }
  expect(STORY_IDS.slice(0, easy.length)).toEqual(easy);
});
