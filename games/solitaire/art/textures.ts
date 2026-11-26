// The textures of the drawn look (decision of 25.11): the felt of the table and the paper of the cards — noise drawn in
// code (shared/ui/textures.ts), dark and light specks over the colours of styles/tokens.css.
import { textureUrl } from '../../../shared/ui/textures.ts';

export const TEXTURES = {
  /** Felt: fine dark fibres and a few light ones. */
  '--tex-felt': textureUrl(160, [
    { freq: 0.85, octaves: 3, kind: 'fractalNoise', tone: 'dark', gain: 0.8, offset: -0.34, seed: 3 },
    { freq: 0.7, octaves: 2, kind: 'fractalNoise', tone: 'light', gain: 0.5, offset: -0.24, seed: 7 },
  ]),
  /** The paper of a card: barely seen. */
  '--tex-paper': textureUrl(200, [{ freq: 0.8, octaves: 3, kind: 'fractalNoise', tone: 'dark', gain: 0.22, offset: -0.09, seed: 5 }]),
} as const;
