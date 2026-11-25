// Textures drawn in code for the games' drawn look (decision of 25.11): felt, paper, wood grain — SVG noise
// (feTurbulence) in a tile that repeats without a seam, as a CSS image. They have no colour of their own: dark or
// light specks over the colour of what they lie on, which comes from the game's tokens.css. Our own, so no licence
// to keep; tiny, and offline like everything else.

export interface Noise {
  /** How fine the noise is: one number, or across and down (a stretched noise makes streaks, as wood grain). */
  freq: number | readonly [number, number];
  octaves: number;
  kind: 'fractalNoise' | 'turbulence';
  /** Dark specks or light ones. */
  tone: 'dark' | 'light';
  /** The specks' opacity is gain × noise + offset: a negative offset leaves most of the tile clear. */
  gain: number;
  offset: number;
  /** Another seed — another noise of the same kind. */
  seed: number;
}

/** A tile of `size` CSS px with the noise layers over each other, as a CSS `url(…)`. */
export function textureUrl(size: number, layers: readonly Noise[]): string {
  const body = layers
    .map((n, i) => {
      const freq = typeof n.freq === 'number' ? String(n.freq) : n.freq.join(' ');
      const ink = n.tone === 'light' ? 1 : 0;
      const matrix = `0 0 0 0 ${ink} 0 0 0 0 ${ink} 0 0 0 0 ${ink} ${n.gain} 0 0 0 ${n.offset}`;
      return (
        `<filter id='t${i}' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
        `<feTurbulence type='${n.kind}' baseFrequency='${freq}' numOctaves='${n.octaves}' seed='${n.seed}' stitchTiles='stitch'/>` +
        `<feColorMatrix values='${matrix}'/></filter><rect width='100%' height='100%' filter='url(#t${i})'/>`
      );
    })
    .join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Puts textures on the page as CSS custom properties (name → tile), for the style sheets to use. */
export function setTextures(root: HTMLElement, textures: Readonly<Record<string, string>>): void {
  for (const [name, url] of Object.entries(textures)) root.style.setProperty(name, url);
}
