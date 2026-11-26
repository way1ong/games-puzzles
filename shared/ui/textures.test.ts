// Textures in code: a tile that repeats without a seam, of noise only (no colour of its own), as a CSS image.
import { expect, it } from 'vitest';
import { textureUrl, type Noise } from './textures.ts';

const DARK: Noise = { freq: 0.8, octaves: 2, kind: 'fractalNoise', tone: 'dark', gain: 0.5, offset: -0.2, seed: 3 };
const decoded = (url: string) => decodeURIComponent(url.replace(/^url\("data:image\/svg\+xml,/, '').replace(/"\)$/, ''));

it('makes a seamless tile of each layer, as a CSS image', () => {
  const url = textureUrl(160, [DARK, { ...DARK, tone: 'light', freq: [0.01, 0.3], seed: 4 }]);
  expect(url).toMatch(/^url\("data:image\/svg\+xml,[^"]+"\)$/);
  const svg = decoded(url);
  expect(svg).toContain("width='160' height='160'");
  expect(svg.match(/<feTurbulence /g)).toHaveLength(2);
  expect(svg.match(/stitchTiles='stitch'/g)).toHaveLength(2);
  expect(svg).toContain("baseFrequency='0.01 0.3'");
  expect(svg).toContain("seed='4'");
});

it('has no colour of its own: dark or light specks only', () => {
  const svg = decoded(textureUrl(100, [DARK, { ...DARK, tone: 'light' }]));
  expect(svg.match(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)).toBeNull();
  expect(svg).toContain("values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0 0 0 -0.2'");
  expect(svg).toContain("values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.5 0 0 0 -0.2'");
});
