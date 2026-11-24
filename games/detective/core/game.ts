// Playing a case: looking over the room (finding the things), then naming the one who did it. The state is
// plain data and every move returns a new state; the case itself (core/cases.ts) never changes.
import { DETECTIVE } from '../config.ts';
import type { CaseDef } from './cases.ts';
import { explain, firstMismatch } from './clues.ts';
import { check, excludedBy, reasonsOf, type Check, type ReasonId } from './deduction.ts';
import { traitsOf } from './people.ts';
import { thingAt, type Placed } from './placement.ts';
import type { ThingId } from './things.ts';
import { isClue, type ClueId } from './traits.ts';

/** intro — the story; search — the room; suspects — who did it; solved — the end. */
export type Stage = 'intro' | 'search' | 'suspects' | 'solved';

export interface Progress {
  version: 1;
  caseId: string;
  /** Free search: the seed its things were placed from. */
  seed: number | null;
  stage: Stage;
  /** Things found, in the order of finding. */
  found: ThingId[];
  hints: number;
  /** Suspects named wrongly, in order. */
  wrong: number[];
  /** Suspects the player has set aside. */
  ruledOut: number[];
  /** Harder levels: the reason each suspect was set aside for (suspect → reason); every one of them holds. */
  reasons: Record<number, ReasonId>;
  /** Harder levels: reasons named that did not rule the person out. */
  slips: number;
}

export function newProgress(def: CaseDef, seed: number | null = null): Progress {
  return { version: 1, caseId: def.id, seed, stage: def.kind === 'search' ? 'search' : 'intro', found: [], hints: 0, wrong: [], ruledOut: [], reasons: {}, slips: 0 };
}

/** From the story to the room. */
export function begin(progress: Progress): Progress {
  return progress.stage === 'intro' ? { ...progress, stage: 'search' } : progress;
}

export function allFound(def: CaseDef, progress: Progress): boolean {
  return def.things.every((p) => progress.found.includes(p.thing));
}

/** Evidence found so far, in the order of finding. */
export function foundClues(progress: Progress): ClueId[] {
  return progress.found.filter(isClue);
}

/** Whether a thing of this case is evidence: it points at a trait, or a circumstance rests on it. */
export function isEvidence(def: CaseDef, thing: ThingId): boolean {
  return isClue(thing) || def.circumstances.some((c) => c.kind === 'time' && c.thing === thing);
}

export function evidenceCount(def: CaseDef): number {
  return def.things.filter((p) => isEvidence(def, p.thing)).length;
}

/**
 * A touch at a point of the room (scene units; `tolerance` — how far from a thing still counts). Free
 * search ends with the last thing found.
 */
export function touch(def: CaseDef, progress: Progress, x: number, y: number, tolerance: number): { progress: Progress; found: Placed | null } {
  if (progress.stage !== 'search') return { progress, found: null };
  const hit = thingAt(def.things, progress.found, x, y, tolerance);
  if (!hit) return { progress, found: null };
  const next: Progress = { ...progress, found: [...progress.found, hit.thing] };
  if (def.kind === 'search' && allFound(def, next)) next.stage = 'solved';
  return { progress: next, found: hit };
}

/** A hint: the first thing of the list not found yet; it is counted. */
export function hint(def: CaseDef, progress: Progress): { progress: Progress; thing: Placed | null } {
  if (progress.stage !== 'search') return { progress, thing: null };
  const thing = def.things.find((p) => !progress.found.includes(p.thing)) ?? null;
  return thing ? { progress: { ...progress, hints: progress.hints + 1 }, thing } : { progress, thing: null };
}

/** From the room to the suspects, once everything is found. */
export function toSuspects(def: CaseDef, progress: Progress): Progress {
  return progress.stage === 'search' && def.kind !== 'search' && allFound(def, progress) ? { ...progress, stage: 'suspects' } : progress;
}

/** An easy case: setting a person aside is the player's own note, free to take back. */
export function toggleRuledOut(def: CaseDef, progress: Progress, suspect: number): Progress {
  if (progress.stage !== 'suspects' || def.level !== 'easy') return progress;
  const ruledOut = progress.ruledOut.includes(suspect) ? progress.ruledOut.filter((i) => i !== suspect) : [...progress.ruledOut, suspect];
  return { ...progress, ruledOut };
}

export interface Ruling {
  progress: Progress;
  /** null — nothing to rule on (not the stage, no such person or reason, or the person is set aside already). */
  check: Check | null;
}

/**
 * A harder case: "it is not this person, because…". A reason that holds sets the person aside for good; one
 * that does not is counted as a slip.
 */
export function rule(def: CaseDef, progress: Progress, suspect: number, reason: ReasonId): Ruling {
  if (progress.stage !== 'suspects' || def.level === 'easy' || !def.suspects[suspect]) return { progress, check: null };
  if (progress.ruledOut.includes(suspect) || !reasonsOf(def).includes(reason)) return { progress, check: null };
  const result = check(def, suspect, reason);
  if (!result.excludes) return { progress: { ...progress, slips: progress.slips + 1 }, check: result };
  return { progress: { ...progress, ruledOut: [...progress.ruledOut, suspect], reasons: { ...progress.reasons, [suspect]: reason } }, check: result };
}

/** Suspects not set aside yet. */
export function remaining(def: CaseDef, progress: Progress): number[] {
  return def.suspects.map((_, i) => i).filter((i) => !progress.ruledOut.includes(i));
}

/**
 * Whether the player may name this person. An easy case — anybody not named wrongly yet; a harder one — only
 * the last person left, when everybody else is set aside with a reason.
 */
export function canAccuse(def: CaseDef, progress: Progress, suspect: number): boolean {
  if (progress.stage !== 'suspects' || !def.suspects[suspect]) return false;
  if (def.level === 'easy') return !progress.wrong.includes(suspect);
  const left = remaining(def, progress);
  return left.length === 1 && left[0] === suspect;
}

export interface Verdict {
  progress: Progress;
  correct: boolean;
  /** The evidence that does not fit the person named wrongly. */
  mismatch: ClueId | null;
}

/** "This is the one." A wrong name is remembered and the person is set aside. */
export function accuse(def: CaseDef, progress: Progress, suspect: number): Verdict {
  const person = def.suspects[suspect];
  if (progress.stage !== 'suspects' || !person) return { progress, correct: false, mismatch: null };
  if (def.level !== 'easy' && !canAccuse(def, progress, suspect)) return { progress, correct: false, mismatch: null };
  if (suspect === def.culprit) return { progress: { ...progress, stage: 'solved' }, correct: true, mismatch: null };
  return {
    progress: {
      ...progress,
      wrong: progress.wrong.includes(suspect) ? progress.wrong : [...progress.wrong, suspect],
      ruledOut: progress.ruledOut.includes(suspect) ? progress.ruledOut : [...progress.ruledOut, suspect],
    },
    correct: false,
    mismatch: firstMismatch(traitsOf(person), def.clues),
  };
}

/** For the end of a case: every piece of evidence with the suspects it fits. */
export function solution(def: CaseDef): { clue: ClueId; who: number[] }[] {
  return explain(def.suspects.map(traitsOf), def.clues);
}

/** For the end of a harder case: everybody else with the first reason (in the order of the screen) that rules them out. */
export function eliminations(def: CaseDef): { suspect: number; reason: ReasonId }[] {
  const out: { suspect: number; reason: ReasonId }[] = [];
  def.suspects.forEach((_, suspect) => {
    const reason = excludedBy(def, suspect)[0];
    if (suspect !== def.culprit && reason !== undefined) out.push({ suspect, reason });
  });
  return out;
}

/** The try on which the right person was named. */
export function tries(progress: Progress): number {
  return progress.wrong.length + 1;
}

export const REGIONS = ['topLeft', 'top', 'topRight', 'left', 'middle', 'right', 'bottomLeft', 'bottom', 'bottomRight'] as const;
export type Region = (typeof REGIONS)[number];

/** The ninth of the room a point is in — for a hint in words. */
export function regionOf(x: number, y: number): Region {
  const col = Math.min(2, Math.max(0, Math.floor((x / DETECTIVE.scene.width) * 3)));
  const row = Math.min(2, Math.max(0, Math.floor((y / DETECTIVE.scene.height) * 3)));
  return REGIONS[row * 3 + col] as Region;
}

/** A saved state that still belongs to this case: unknown things and suspects are dropped. */
export function restore(def: CaseDef, saved: unknown): Progress | null {
  const p = saved as Partial<Progress> | null;
  if (!p || p.version !== 1 || p.caseId !== def.id) return null;
  const stages: Stage[] = ['intro', 'search', 'suspects', 'solved'];
  if (!stages.includes(p.stage as Stage) || !Array.isArray(p.found) || !Array.isArray(p.wrong) || !Array.isArray(p.ruledOut)) return null;
  const things = new Set<string>(def.things.map((t) => t.thing));
  const person = (i: unknown): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < def.suspects.length;
  const progress: Progress = {
    version: 1,
    caseId: def.id,
    seed: typeof p.seed === 'number' ? p.seed : null,
    stage: p.stage as Stage,
    found: [...new Set(p.found.filter((t): t is ThingId => typeof t === 'string' && things.has(t)))],
    hints: typeof p.hints === 'number' && p.hints >= 0 ? Math.floor(p.hints) : 0,
    wrong: p.wrong.filter(person),
    ruledOut: [...new Set(p.ruledOut.filter(person))],
    reasons: {},
    slips: typeof p.slips === 'number' && p.slips >= 0 ? Math.floor(p.slips) : 0,
  };
  if (def.level !== 'easy') {
    // only people set aside for a reason that holds stay aside
    const known = reasonsOf(def);
    const saved = (p.reasons ?? {}) as Record<string, unknown>;
    progress.ruledOut = progress.ruledOut.filter((i) => {
      const reason = saved[i] as ReasonId;
      if (!known.includes(reason) || !check(def, i, reason).excludes) return false;
      progress.reasons[i] = reason;
      return true;
    });
    progress.wrong = [];
  }
  // A stage the found things do not allow (the case was changed since): back to the room.
  if ((progress.stage === 'suspects' || progress.stage === 'solved') && !allFound(def, progress)) progress.stage = 'search';
  if (def.kind === 'search' && progress.stage === 'suspects') progress.stage = 'search';
  return progress;
}
