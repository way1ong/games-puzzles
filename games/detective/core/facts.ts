// What is known about a suspect beyond the looks, and what the scene itself says — the stuff of the harder
// levels (docs/detective/SPEC.md, «Рівні»). An easy case has neither.
import type { ThingId } from './things.ts';

/** easy — every piece of evidence points at a trait; medium — facts, circumstances and a false lead. */
export const LEVELS = ['easy', 'medium'] as const;
export type Level = (typeof LEVELS)[number];

/** Why a person was in the room openly by day (dictionaries: visits.<id>). */
export const VISITS = ['flowers'] as const;
export type VisitId = (typeof VISITS)[number];

/** Where a person was seen at some time (dictionaries: away.<id>). */
export const AWAYS = ['mailSorting'] as const;
export type AwayId = (typeof AWAYS)[number];

/** A moment of the day, in minutes after midnight. */
export type Minutes = number;

export type Fact =
  /** Has a key to the door of the room. */
  | { kind: 'key' }
  /** Was in the room openly by day: evidence this person could leave proves nothing. */
  | { kind: 'visit'; why: VisitId }
  /** Was seen elsewhere from…to: an alibi for any moment in between. */
  | { kind: 'away'; from: Minutes; to: Minutes; where: AwayId };

export type Circumstance =
  /** The lock is whole: the door was opened with a key, so the one who did it has one. */
  | { kind: 'locked' }
  /** It happened at this moment — a stopped watch among the things says so. */
  | { kind: 'time'; at: Minutes; thing: ThingId };

export type CircumstanceKind = Circumstance['kind'];
export const CIRCUMSTANCE_KINDS: readonly CircumstanceKind[] = ['locked', 'time'];

export function hasKey(facts: readonly Fact[]): boolean {
  return facts.some((f) => f.kind === 'key');
}

export function visitOf(facts: readonly Fact[]): VisitId | null {
  const visit = facts.find((f) => f.kind === 'visit');
  return visit?.kind === 'visit' ? visit.why : null;
}

/** The alibi that covers this moment; null — none. */
export function awayAt(facts: readonly Fact[], at: Minutes): Extract<Fact, { kind: 'away' }> | null {
  for (const f of facts) if (f.kind === 'away' && f.from <= at && at <= f.to) return f;
  return null;
}

export function alibis(facts: readonly Fact[]): Extract<Fact, { kind: 'away' }>[] {
  return facts.filter((f): f is Extract<Fact, { kind: 'away' }> => f.kind === 'away');
}
