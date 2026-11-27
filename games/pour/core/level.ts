// The three ways (docs/pour/SPEC.md, "Три шляхи"): levels in a row — more colours, stage by stage, and within a stage
// later levels take harder deals; free play by difficulty; the level of the day, the same for everybody. Every deal
// is one the solver has solved. Pure; randomness only from seeds.
import { seedFromText } from '../../../shared/core/rng.ts';
import { POUR, type Difficulty } from '../config.ts';
import type { Bottles } from './bottles.ts';
import { deal } from './deal.ts';
import { winRate } from './difficulty.ts';
import { solve } from './solve.ts';

export interface Deal {
  bottles: Bottles;
  paints: number[];
  colours: number;
  /** The seed it was dealt from. */
  seed: number;
}

/** The stage of a level: its colours and its place within the stage, 0 (first) … 1 (last). */
export function stageOf(level: number): { colours: number; place: number } {
  const stages = POUR.stages;
  let i = 0;
  while (i + 1 < stages.length && stages[i + 1]!.from <= level) i++;
  const stage = stages[i]!;
  const next = stages[i + 1];
  if (next) {
    const length = next.from - stage.from;
    return { colours: stage.colours, place: length > 1 ? (level - stage.from) / (length - 1) : 1 };
  }
  // the last stage has no end: its levels go round from middling to hard (C)
  const round = 5;
  return { colours: stage.colours, place: 0.5 + (0.5 * ((level - stage.from) % round)) / (round - 1) };
}

/** Solvable deals from a seed, one after another. */
function* solvable(colours: number, seed: number): Generator<Deal> {
  let state = seed;
  for (;;) {
    const d = deal(colours, POUR.empty, POUR.capacity, POUR.paints, state);
    const at = state;
    state = d.state;
    if (solve(d.bottles, POUR.capacity, POUR.solveLimit).moves) yield { bottles: d.bottles, paints: d.paints, colours, seed: at };
  }
}

/** Of a few solvable deals, the one at `place` from the easiest (0) to the hardest (1). */
export function pickDeal(colours: number, seed: number, place: number): Deal {
  const deals: { deal: Deal; rate: number }[] = [];
  const source = solvable(colours, seed);
  for (let i = 0; i < POUR.pick.deals; i++) {
    const d = source.next().value as Deal;
    deals.push({ deal: d, rate: winRate(d.bottles, POUR.capacity, POUR.pick, d.seed) });
  }
  // easiest first; equal ones in the order dealt
  const order = deals.map((d, i) => ({ ...d, i })).sort((a, b) => b.rate - a.rate || a.i - b.i);
  return order[Math.round(place * (order.length - 1))]!.deal;
}

export function levelDeal(level: number): Deal {
  const { colours, place } = stageOf(level);
  return pickDeal(colours, seedFromText(`way1ong-pour:level:${level}`), place);
}

/** Free play: a new deal of the difficulty's colours (any seed — a new game each time). */
export function freeDeal(difficulty: Difficulty, seed: number): Deal {
  return solvable(POUR.difficulties[difficulty], seed).next().value as Deal;
}

/** The level of the day: middling of a few deals from the day's seed (C). */
export function dailyDeal(dateKey: string): Deal {
  return pickDeal(POUR.dailyColours, seedFromText(`way1ong-pour:daily:${dateKey}`), 0.5);
}
