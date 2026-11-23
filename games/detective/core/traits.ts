// What evidence can point at. Every trait shows on the portrait and is written in words on the person's
// card (docs/detective/SPEC.md, «Підозрювані й прикмети»).

export const HAIR = ['red', 'dark', 'blond', 'gray'] as const;
export type Hair = (typeof HAIR)[number];
export const BUTTONS = ['blue', 'brown', 'gold'] as const;
export type Buttons = (typeof BUTTONS)[number];
export const SCARVES = ['red', 'yellow', 'blue'] as const;
export type Scarf = (typeof SCARVES)[number];

export interface Traits {
  hair: Hair;
  glasses: boolean;
  /** Colour of the buttons of the coat or cardigan. */
  buttons: Buttons;
  scarf: Scarf | null;
  flower: boolean;
}

/**
 * A piece of evidence, named by the trait it points at: "hair:red" — a red hair, "glasses" — a lens,
 * "buttons:blue" — a blue button, "scarf:yellow" — a yellow thread, "flower" — a petal.
 */
export type ClueId = `hair:${Hair}` | 'glasses' | `buttons:${Buttons}` | `scarf:${Scarf}` | 'flower';
export type ClueKind = 'hair' | 'glasses' | 'buttons' | 'scarf' | 'flower';

export const CLUE_KINDS: readonly ClueKind[] = ['hair', 'glasses', 'buttons', 'scarf', 'flower'];

export const ALL_CLUES: readonly ClueId[] = [
  ...HAIR.map((v): ClueId => `hair:${v}`),
  'glasses',
  ...BUTTONS.map((v): ClueId => `buttons:${v}`),
  ...SCARVES.map((v): ClueId => `scarf:${v}`),
  'flower',
];

export function isClue(id: string): id is ClueId {
  return (ALL_CLUES as readonly string[]).includes(id);
}

export function clueKind(id: ClueId): ClueKind {
  return id.split(':')[0] as ClueKind;
}

/** Whether a person with these traits could have left this evidence. */
export function fits(traits: Traits, clue: ClueId): boolean {
  const [kind, value] = clue.split(':') as [ClueKind, string | undefined];
  switch (kind) {
    case 'hair':
      return traits.hair === value;
    case 'glasses':
      return traits.glasses;
    case 'buttons':
      return traits.buttons === value;
    case 'scarf':
      return traits.scarf === value;
    case 'flower':
      return traits.flower;
  }
}

/** The evidence a person with these traits could leave. */
export function cluesOf(traits: Traits): ClueId[] {
  return ALL_CLUES.filter((clue) => fits(traits, clue));
}
