// The drawings: every colour comes from the palette, scenes and portraits are whole (no broken numbers, no
// two definitions with one name), every thing of a case is in its scene, and every trait that evidence can
// point at changes the portrait.
import { describe, expect, it } from 'vitest';
import { STORIES, STORY_IDS } from '../core/cases.ts';
import { dailyCase } from '../core/daily.ts';
import { PEOPLE, PERSON_IDS, type Suspect } from '../core/people.ts';
import { ORDINARY, sizeOf, type ThingId } from '../core/things.ts';
import { ALL_CLUES, BUTTONS, SCARVES } from '../core/traits.ts';
import { BUTTON_PAINT, GLASSES, SCARF_PAINT, roomPaint, thingPaint } from './palette.ts';
import { portraitSvg } from './people/portrait.ts';
import { sceneSvg } from './scene.ts';
import { thingArt, thingIcon } from './things.ts';

const sources = import.meta.glob<string>('./**/*.ts', { query: '?raw', import: 'default', eager: true });

it('keeps colours in palette.ts only', () => {
  const COLOUR = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;
  const files = Object.entries(sources).filter(([file]) => !file.endsWith('/palette.ts') && !file.endsWith('.test.ts'));
  expect(files.length).toBeGreaterThan(20);
  for (const [file, text] of files) {
    const line = text.split('\n').find((l) => COLOUR.test(l));
    expect(line, file).toBeUndefined();
  }
});

/** A drawing is whole: no broken numbers and no name defined twice. */
function expectWhole(svg: string, what: string): void {
  expect(svg.startsWith('<svg') && svg.endsWith('</svg>'), what).toBe(true);
  expect(/NaN|undefined|Infinity|\[object/.test(svg), what).toBe(false);
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, what).toBe(ids.length);
  for (const [, name] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids, `${what}: ${name}`).toContain(name);
}

describe('scenes', () => {
  const cases = [...STORY_IDS.map((id) => STORIES[id]), dailyCase('2026-11-23'), dailyCase('2026-11-24')];

  it.each(cases.map((def) => [def.id, def] as const))('%s: the room with every thing of the case', (_id, def) => {
    const svg = sceneSvg(def);
    expectWhole(svg, def.id);
    for (const { thing } of def.things) expect(svg, thing).toContain(`data-thing="${thing}"`);
    expect(svg).toContain('class="scene__marks"');
  });

  it('does not draw things found already', () => {
    const def = STORIES.lostLetter;
    const svg = sceneSvg({ ...def, found: ['key', 'hair:red'] });
    expect(svg).not.toContain('data-thing="key"');
    expect(svg).not.toContain('data-thing="hair:red"');
    expect(svg).toContain('data-thing="coin"');
  });

  it('is another picture at night', () => {
    const def = STORIES.lostLetter;
    expect(sceneSvg({ ...def, time: 'night' })).not.toBe(sceneSvg(def));
    expect(roomPaint('night').wallTop).not.toBe(roomPaint('day').wallTop);
  });
});

describe('things', () => {
  const things: ThingId[] = [...ORDINARY, ...ALL_CLUES];

  it('each has a drawing and an icon of its size', () => {
    for (const thing of things) {
      expect(thingArt(thing, 'day').length, thing).toBeGreaterThan(20);
      const icon = thingIcon(thing);
      expectWhole(icon, thing);
      const { w, h } = sizeOf(thing);
      expect(icon, thing).toContain(`viewBox="${-w / 2 - 3} ${-h - 3} ${w + 6} ${h + 6}"`);
    }
  });

  it('evidence of different colours is drawn differently', () => {
    const drawings = new Set(ALL_CLUES.map((clue) => thingArt(clue, 'day')));
    expect(drawings.size).toBe(ALL_CLUES.length);
  });

  it('stay brighter at night than the furniture around them', () => {
    const light = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    for (const name of ['gold', 'red', 'linen', 'blue', 'cream'] as const) {
      expect(light(thingPaint('night')[name]), name).toBeGreaterThan(light(roomPaint('night')[name]));
      expect(thingPaint('day')[name], name).toBe(roomPaint('day')[name]);
    }
  });
});

describe('portraits', () => {
  const plain = (person: Suspect['person']): Suspect => ({ person, buttons: 'brown', scarf: null, flower: false });

  it.each(PERSON_IDS)('%s is a whole drawing in any outfit', (person) => {
    for (const buttons of BUTTONS) {
      for (const scarf of [null, ...SCARVES]) {
        for (const flower of [false, true]) expectWhole(portraitSvg({ person, buttons, scarf, flower }), `${person} ${buttons} ${scarf} ${flower}`);
      }
    }
  });

  it('every person looks different', () => {
    expect(new Set(PERSON_IDS.map((person) => portraitSvg(plain(person)).replaceAll(`-${person}-`, '-x-'))).size).toBe(PERSON_IDS.length);
  });

  it('show every trait that evidence can point at', () => {
    for (const person of PERSON_IDS) {
      const base = portraitSvg(plain(person));
      // glasses: the frame colours are there only for those who wear them
      const framed = base.includes(`stroke="${GLASSES.round}"`) || base.includes(`stroke="${GLASSES.rect}"`);
      expect(framed, `${person}: glasses`).toBe(PEOPLE[person].glasses);
      // buttons: the colour of the case
      for (const buttons of BUTTONS) expect(portraitSvg({ ...plain(person), buttons }), `${person}: ${buttons} buttons`).toContain(BUTTON_PAINT[buttons].fill);
      // a scarf of its colour, a flower
      expect(base, `${person}: no scarf`).not.toContain('scarf');
      for (const scarf of SCARVES) expect(portraitSvg({ ...plain(person), scarf }), `${person}: ${scarf} scarf`).toContain(SCARF_PAINT[scarf].main);
      expect(portraitSvg({ ...plain(person), flower: true }), `${person}: flower`).not.toBe(base);
    }
  });

  it('two portraits of one person on a page do not share names', () => {
    const a = portraitSvg(plain('anna'), {}, 'card');
    const b = portraitSvg(plain('anna'), {}, 'big');
    const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(a).filter((id) => ids(b).includes(id))).toEqual([]);
  });
});
