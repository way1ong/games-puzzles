// Hand-made cases: the right numbers of things, evidence and suspects, a fair puzzle, things on real places.
import { describe, expect, it } from 'vitest';
import { DETECTIVE } from '../config.ts';
import { STORIES, STORY_IDS } from './cases.ts';
import { fairness } from './clues.ts';
import { traitsOf } from './people.ts';
import { placementProblems } from './placement.ts';
import { SPOTS } from './rooms.ts';
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

  it('is a fair puzzle: one answer, every clue needed', () => {
    expect(fairness(def.suspects.map(traitsOf), def.clues)).toEqual({ fit: [def.culprit], needless: [] });
  });

  it('keeps every thing on a place of the room', () => {
    expect(placementProblems(def.things, SPOTS[def.room])).toEqual([]);
  });
});

it('light and noir cases take turns', () => {
  const times = STORY_IDS.map((id) => STORIES[id].time);
  times.forEach((time, i) => expect(time).toBe(i % 2 === 0 ? 'day' : 'night'));
});
