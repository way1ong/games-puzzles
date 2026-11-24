// Deduction: what rules a suspect out. A circumstance rules out whoever cannot meet it; a piece of evidence
// rules out whoever it does not fit — unless a daytime visitor could have left it, then it proves nothing
// (a false lead). A fair case leaves exactly one person, and needs every reason it gives
// (docs/detective/SPEC.md, «Рівні» and «Чесна загадка»).
import type { CaseDef } from './cases.ts';
import { awayAt, hasKey, visitOf, type CircumstanceKind, type Fact } from './facts.ts';
import { traitsOf } from './people.ts';
import { fits, isClue, type ClueId } from './traits.ts';

/** What a player can name as the reason to rule a person out: a circumstance or a piece of evidence. */
export type ReasonId = CircumstanceKind | ClueId;

/** The reasons of a case, in the order of the screen: circumstances, then evidence. */
export function reasonsOf(def: CaseDef): ReasonId[] {
  return [...def.circumstances.map((c) => c.kind), ...def.clues];
}

export function factsOf(def: CaseDef, suspect: number): readonly Fact[] {
  return def.facts[suspect] ?? [];
}

/** Daytime visitors, by index. */
export function visitors(def: CaseDef): number[] {
  return def.suspects.map((_, i) => i).filter((i) => visitOf(factsOf(def, i)) !== null);
}

/** A daytime visitor other than `except` who could have left this evidence; null — nobody. */
export function leftBy(def: CaseDef, clue: ClueId, except: number): number | null {
  return visitors(def).find((i) => i !== except && fits(traitsOf(def.suspects[i] as (typeof def.suspects)[number]), clue)) ?? null;
}

/** Evidence that proves nothing about anybody but its visitor: the false leads of the case. */
export function falseLeads(def: CaseDef): { clue: ClueId; visitor: number }[] {
  const out: { clue: ClueId; visitor: number }[] = [];
  for (const clue of def.clues) {
    const visitor = leftBy(def, clue, -1);
    if (visitor !== null) out.push({ clue, visitor });
  }
  return out;
}

export type Check =
  | { excludes: true }
  /** hasKey, free, fits — the person meets it; visitor — a daytime visitor could have left the evidence. */
  | { excludes: false; why: 'hasKey' | 'free' | 'fits' }
  | { excludes: false; why: 'visitor'; visitor: number };

/** Whether this reason rules this suspect out, and if not — why not. */
export function check(def: CaseDef, suspect: number, reason: ReasonId): Check {
  const person = def.suspects[suspect];
  if (!person) throw new Error(`No suspect ${suspect} in the case ${def.id}`);
  const facts = factsOf(def, suspect);
  if (isClue(reason)) {
    if (fits(traitsOf(person), reason)) return { excludes: false, why: 'fits' };
    const visitor = leftBy(def, reason, suspect);
    return visitor === null ? { excludes: true } : { excludes: false, why: 'visitor', visitor };
  }
  const circumstance = def.circumstances.find((c) => c.kind === reason);
  if (!circumstance) throw new Error(`No circumstance "${reason}" in the case ${def.id}`);
  if (circumstance.kind === 'locked') return hasKey(facts) ? { excludes: false, why: 'hasKey' } : { excludes: true };
  return awayAt(facts, circumstance.at) ? { excludes: true } : { excludes: false, why: 'free' };
}

/** The reasons that rule this suspect out, in the order of the screen. */
export function excludedBy(def: CaseDef, suspect: number, reasons: readonly ReasonId[] = reasonsOf(def)): ReasonId[] {
  return reasons.filter((reason) => check(def, suspect, reason).excludes);
}

/** Suspects no reason rules out. */
export function candidates(def: CaseDef, reasons: readonly ReasonId[] = reasonsOf(def)): number[] {
  return def.suspects.map((_, i) => i).filter((i) => excludedBy(def, i, reasons).length === 0);
}

/** Suspects every piece of evidence fits, taken at face value: the answer of a hasty reader. */
export function atFaceValue(def: CaseDef): number[] {
  return def.suspects.map((_, i) => i).filter((i) => def.clues.every((clue) => fits(traitsOf(def.suspects[i] as (typeof def.suspects)[number]), clue)));
}

/** What is wrong with a case as a puzzle; empty — it is fair. */
export function puzzleProblems(def: CaseDef): string[] {
  const out: string[] = [];
  const reasons = reasonsOf(def);
  const left = candidates(def);
  if (left.length !== 1 || left[0] !== def.culprit) out.push(`the reasons leave ${JSON.stringify(left)}, not only the one who did it (${def.culprit})`);
  if (new Set(reasons).size !== reasons.length) out.push('a reason is given twice');
  const leads = falseLeads(def);
  for (const reason of reasons) {
    if (leads.some((l) => l.clue === reason)) continue;
    if (candidates(def, reasons.filter((r) => r !== reason)).length <= 1) out.push(`"${reason}" is not needed: without it the same person is left`);
  }
  for (const c of def.circumstances) {
    if (c.kind === 'time' && !def.things.some((p) => p.thing === c.thing)) out.push(`the ${c.thing} that tells the time is not among the things`);
  }
  def.facts.forEach((facts, i) => {
    for (const f of facts) if (f.kind === 'away' && f.from >= f.to) out.push(`suspect ${i}: an alibi that ends before it starts`);
  });
  if (def.facts.length > def.suspects.length) out.push('facts about more people than there are suspects');

  if (def.level === 'easy') {
    if (def.circumstances.length > 0 || def.facts.some((f) => f.length > 0)) out.push('an easy case has no circumstances and no facts');
    return out;
  }
  // medium: the hasty answer is wrong, and the false lead is somebody's
  if (def.circumstances.length === 0) out.push('a medium case needs a circumstance');
  if (leads.length === 0) out.push('a medium case needs a false lead');
  for (const { clue, visitor } of leads) {
    const culprit = def.suspects[def.culprit];
    if (visitor === def.culprit) out.push(`the visitor who left "${clue}" is the one who did it`);
    if (culprit && fits(traitsOf(culprit), clue)) out.push(`the false lead "${clue}" fits the one who did it: it misleads nobody`);
  }
  const hasty = atFaceValue(def);
  if (hasty.length === 0) out.push('nobody fits all the evidence at face value: the false lead gives itself away');
  if (hasty.includes(def.culprit)) out.push('the one who did it fits all the evidence at face value: no deduction is needed');
  return out;
}
