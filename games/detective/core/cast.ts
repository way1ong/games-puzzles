// The suspects of a daily case, made from a seed: six people, their outfits, who did it and three pieces
// of evidence — so that the puzzle is fair (core/clues.ts). For every piece of evidence one more person
// fits the other two, so each piece is needed.
import { nextInt } from '../../../shared/core/rng.ts';
import { DETECTIVE } from '../config.ts';
import { isFair } from './clues.ts';
import { PEOPLE, PERSON_IDS, traitsOf, type Suspect } from './people.ts';
import { BUTTONS, CLUE_KINDS, SCARVES, clueKind, cluesOf, type ClueId, type ClueKind } from './traits.ts';

export interface Cast {
  suspects: Suspect[];
  culprit: number;
  clues: ClueId[];
}

const TRIES = 500;

function shuffled<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const pick = nextInt(s, i + 1);
    s = pick.state;
    [out[i], out[pick.value]] = [out[pick.value] as T, out[i] as T];
  }
  return { items: out, state: s };
}

/** Whether this person can fit every clue but `except`, and not fit `except` — whatever they wear. */
function canMiss(suspect: Suspect, clues: readonly ClueId[], except: ClueId): boolean {
  const person = PEOPLE[suspect.person];
  for (const clue of clues) {
    const [kind, value] = clue.split(':') as [ClueKind, string | undefined];
    const wanted = clue !== except;
    if (kind === 'hair' && (person.hair === value) !== wanted) return false;
    if (kind === 'glasses' && person.glasses !== wanted) return false;
  }
  return true;
}

/** Dresses the person to fit every clue but `except`. */
function dress(suspect: Suspect, clues: readonly ClueId[], except: ClueId): void {
  for (const clue of clues) {
    const [kind, value] = clue.split(':') as [ClueKind, string | undefined];
    const wanted = clue !== except;
    if (kind === 'buttons') {
      const other = BUTTONS[(BUTTONS.indexOf(value as (typeof BUTTONS)[number]) + 1) % BUTTONS.length] as (typeof BUTTONS)[number];
      suspect.buttons = wanted ? (value as (typeof BUTTONS)[number]) : other;
    }
    if (kind === 'scarf') suspect.scarf = wanted ? (value as (typeof SCARVES)[number]) : null;
    if (kind === 'flower') suspect.flower = wanted;
  }
}

export function makeCast(seed: number): Cast {
  let state = seed >>> 0;
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const people = shuffled(PERSON_IDS, state);
    state = people.state;
    const suspects: Suspect[] = [];
    for (const person of people.items.slice(0, DETECTIVE.suspectsPerCase)) {
      const b = nextInt(state, BUTTONS.length);
      const s = nextInt(b.state, SCARVES.length + 2); // two chances in five of no scarf
      const f = nextInt(s.state, 3);
      state = f.state;
      suspects.push({
        person,
        buttons: BUTTONS[b.value] as (typeof BUTTONS)[number],
        scarf: SCARVES[s.value] ?? null,
        flower: f.value === 0,
      });
    }
    const who = nextInt(state, suspects.length);
    state = who.state;
    const culprit = suspects[who.value] as Suspect;
    const person = PEOPLE[culprit.person];

    // Three kinds of evidence this person can leave; the outfit follows.
    const possible = CLUE_KINDS.filter((kind) => kind !== 'glasses' || person.glasses);
    const kinds = shuffled(possible, state);
    state = kinds.state;
    const chosen = kinds.items.slice(0, DETECTIVE.cluesPerCase);
    if (chosen.includes('scarf') && culprit.scarf === null) {
      const colour = nextInt(state, SCARVES.length);
      state = colour.state;
      culprit.scarf = SCARVES[colour.value] as (typeof SCARVES)[number];
    }
    if (chosen.includes('flower')) culprit.flower = true;
    const left = cluesOf(traitsOf(culprit));
    const clues = chosen.map((kind) => left.find((clue) => clueKind(clue) === kind) as ClueId);

    // For every clue — another person who fits the rest but not this one.
    const others = shuffled(suspects.map((_, i) => i).filter((i) => i !== who.value), state);
    state = others.state;
    const taken = new Set<number>();
    const complete = clues.every((clue) => {
      const near = others.items.find((i) => !taken.has(i) && canMiss(suspects[i] as Suspect, clues, clue));
      if (near === undefined) return false;
      taken.add(near);
      dress(suspects[near] as Suspect, clues, clue);
      return true;
    });
    if (complete && isFair(suspects.map(traitsOf), clues, who.value)) return { suspects, culprit: who.value, clues };
  }
  throw new Error(`No fair cast for the seed ${seed}`);
}
