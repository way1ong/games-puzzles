// Levels and the layout of the day, each from its own seed: level N and the day D are the same for everybody
// (docs/pairs/SPEC.md, "Розклади й рівні", "Розклад дня"). The layout is chosen by the seed's generator, not by
// the remainder of the text seed (.claude/rules/game-logic.md). Pure.
import { seedFromText } from '../../../shared/core/rng.ts';
import { PAIRS, type LevelStep } from '../config.ts';
import { isLayoutName, type LayoutName } from './layouts.ts';
import { newPlay, type PairsPlay } from './play.ts';
import { makeRand } from './rand.ts';

/** The step of the levels a level belongs to. */
export function stepOf(number: number): LevelStep {
  let step = PAIRS.levels[0];
  for (const s of PAIRS.levels) if (number >= s.from) step = s;
  if (!step) throw new Error('No steps of levels in the config');
  return step;
}

function playFrom(text: string, layouts: readonly string[], number: number | null, daily: string | null): PairsPlay {
  const rand = makeRand(seedFromText(text));
  const name = layouts[rand.int(layouts.length)]!;
  if (!isLayoutName(name)) throw new Error(`No layout "${name}"`);
  const layout: LayoutName = name;
  let seed = rand.int(0x100000000);
  // A seed that gives no deal (none known) is followed by the next one: still the same for everybody.
  for (let attempt = 0; attempt < 16; attempt++, seed = (seed + 1) >>> 0) {
    const play = newPlay(layout, seed, number, daily);
    if (play) return play;
  }
  throw new Error(`No deal for ${text}`);
}

export function makeLevel(number: number): PairsPlay {
  return playFrom(`way1ong-pairs:level:${number}`, stepOf(number).layouts, number, null);
}

export function makeDaily(dateKey: string): PairsPlay {
  return playFrom(`way1ong-pairs:daily:${dateKey}`, PAIRS.daily.layouts, null, dateKey);
}
