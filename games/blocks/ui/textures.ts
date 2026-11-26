// The textures of the drawn look (decision of 25.11): the grain of the wooden board and of the blocks — noise drawn in
// code (shared/ui/textures.ts), dark streaks over the colours of styles/tokens.css.
import { textureUrl } from '../../../shared/ui/textures.ts';

export const TEXTURES = {
  /** The board: long streaks of grain and wider rings. */
  '--tex-grain': textureUrl(240, [
    { freq: [0.012, 0.32], octaves: 3, kind: 'fractalNoise', tone: 'dark', gain: 0.75, offset: -0.3, seed: 9 },
    { freq: [0.006, 0.09], octaves: 2, kind: 'turbulence', tone: 'dark', gain: 0.28, offset: -0.03, seed: 2 },
  ]),
  /** A block and an empty cell: a finer, fainter grain. */
  '--tex-grain-fine': textureUrl(120, [{ freq: [0.02, 0.45], octaves: 2, kind: 'fractalNoise', tone: 'dark', gain: 0.42, offset: -0.16, seed: 11 }]),
} as const;
