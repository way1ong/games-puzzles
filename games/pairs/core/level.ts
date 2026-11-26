// Levels and the layout of the day, each from its own seed: level N and the day D are the same for everybody
// (docs/pairs/SPEC.md, "Розклади й рівні", "Розклад дня"). The layout is chosen by the seed's generator, not by
// the remainder of the text seed (.claude/rules/game-logic.md); of a few deals from the seed on, the one as hard as
// the step asks (decision of 25.11). Pure.
import { seedFromText } from '../../../shared/core/rng.ts';
import { PAIRS, type LevelStep } from '../config.ts';
import { clearRate } from './difficulty.ts';
import { isLayoutName, type LayoutName } from './layouts.ts';
import { newPlay, tableFor, type PairsPlay } from './play.ts';
import { makeRand } from './rand.ts';

/** The step of the levels a level belongs to. */
export function stepOf(number: number): LevelStep {
  let step = PAIRS.levels[0];
  for (const s of PAIRS.levels) if (number >= s.from) step = s;
  if (!step) throw new Error('No steps of levels in the config');
  return step;
}

function playFrom(text: string, layouts: readonly string[], rate: number, number: number | null, daily: string | null): PairsPlay {
  const rand = makeRand(seedFromText(text));
  const name = layouts[rand.int(layouts.length)]!;
  if (!isLayoutName(name)) throw new Error(`No layout "${name}"`);
  const layout: LayoutName = name;
  const table = tableFor(layout);
  const { candidates, plays } = PAIRS.difficulty;
  let seed = rand.int(0x100000000);
  // Deals from the seeds in a row (a seed that gives none is passed over), the one nearest the rate kept: the first
  // of equals, so still the same for everybody.
  let best: PairsPlay | null = null;
  let bestGap = Infinity;
  for (let attempt = 0, found = 0; found < candidates && attempt < candidates + 16; attempt++, seed = (seed + 1) >>> 0) {
    const play = newPlay(layout, seed, number, daily);
    if (!play) continue;
    found += 1;
    const gap = Math.abs(clearRate(table, play.kinds, plays, seed) - rate);
    if (gap < bestGap) {
      best = play;
      bestGap = gap;
    }
  }
  if (!best) throw new Error(`No deal for ${text}`);
  return best;
}

export function makeLevel(number: number): PairsPlay {
  const step = stepOf(number);
  return playFrom(`way1ong-pairs:level:${number}`, step.layouts, step.rate, number, null);
}

export function makeDaily(dateKey: string): PairsPlay {
  return playFrom(`way1ong-pairs:daily:${dateKey}`, PAIRS.daily.layouts, PAIRS.daily.rate, null, dateKey);
}
