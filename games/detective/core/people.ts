// The people of the game. Each has a name and an occupation (dictionaries: people.<id>) and a fixed
// appearance: hair colour and glasses never change from case to case, so a familiar face stays familiar.
// The outfit (buttons, scarf, flower) belongs to a case. How a person is drawn — art/people/looks.ts.
import type { Buttons, Hair, Scarf, Traits } from './traits.ts';

export const PERSON_IDS = [
  'anna',
  'viktor',
  'marta',
  'bence',
  'oleg',
  'lina',
  'ilona',
  'tamas',
  'sofia',
  'pavlo',
  'emma',
  'gabor',
  'nora',
] as const;
export type PersonId = (typeof PERSON_IDS)[number];

export interface Person {
  hair: Hair;
  glasses: boolean;
}

// Three or more people of every hair colour: a hair as evidence needs two more people with the same hair.
export const PEOPLE: Record<PersonId, Person> = {
  anna: { hair: 'red', glasses: true },
  viktor: { hair: 'dark', glasses: true },
  marta: { hair: 'red', glasses: true },
  bence: { hair: 'blond', glasses: false },
  oleg: { hair: 'gray', glasses: false },
  lina: { hair: 'red', glasses: false },
  ilona: { hair: 'gray', glasses: true },
  tamas: { hair: 'dark', glasses: true },
  sofia: { hair: 'dark', glasses: false },
  pavlo: { hair: 'dark', glasses: false },
  emma: { hair: 'blond', glasses: false },
  gabor: { hair: 'gray', glasses: false },
  nora: { hair: 'blond', glasses: true },
};

/** A person as they look in one case. */
export interface Suspect {
  person: PersonId;
  buttons: Buttons;
  scarf: Scarf | null;
  flower: boolean;
}

export function traitsOf(suspect: Suspect): Traits {
  const person = PEOPLE[suspect.person];
  return { hair: person.hair, glasses: person.glasses, buttons: suspect.buttons, scarf: suspect.scarf, flower: suspect.flower };
}
