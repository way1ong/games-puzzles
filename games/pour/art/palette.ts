// The paints of the box (docs/pour/SPEC.md, "Візерунки"): each with its water colour and the ink of its pattern (the
// one of black and white that reads on it), the same in both themes so a colour keeps its look; each paint has its own
// pattern (styles/app.css, .pat-0 … .pat-10) and name (the dictionaries, paints.p0 …). A deal draws its colours from
// the box (config: paints).
export interface Paint {
  water: string;
  ink: string;
}

export const PAINTS: readonly Paint[] = [
  { water: '#d62839', ink: '#ffffff' }, // red — plain
  { water: '#f2852c', ink: '#1a1a1a' }, // orange — lines across
  { water: '#f7d23e', ink: '#1a1a1a' }, // yellow — lines up
  { water: '#9ed43a', ink: '#1a1a1a' }, // lime — slanting up
  { water: '#1f8f4a', ink: '#1a1a1a' }, // green — slanting down
  { water: '#22b5a5', ink: '#1a1a1a' }, // teal — small dots
  { water: '#6cc3f0', ink: '#1a1a1a' }, // sky blue — rings
  { water: '#2b55d4', ink: '#ffffff' }, // blue — checks
  { water: '#7b3fb8', ink: '#ffffff' }, // purple — grid
  { water: '#f07ab8', ink: '#1a1a1a' }, // pink — cross-hatching
  { water: '#8a5a2e', ink: '#ffffff' }, // brown — big dots
];
