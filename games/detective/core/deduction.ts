// Deduction: what rules a suspect out. A circumstance rules out whoever cannot meet it; a piece of evidence
// rules out whoever it does not fit — unless a daytime visitor could have left it, then it proves nothing
// (a false lead). On the hard level everybody says where they were, and only the one who did it lies: a
// person is ruled out when somebody else's statement gives them an alibi, or when two other people's
// statements cannot both be true (then one of those two did it). A fair case leaves exactly one person
// (docs/detective/SPEC.md, «Рівні» and «Чесна загадка»).
import { DETECTIVE } from '../config.ts';
import type { CaseDef } from './cases.ts';
import { PLACES, awayAt, hasKey, visitOf, type CircumstanceKind, type Fact, type PlaceId } from './facts.ts';
import { traitsOf } from './people.ts';
import { fits, isClue, type ClueId } from './traits.ts';

/** The statement of a suspect, by index: "say:2". */
export type SayId = `say:${number}`;
/** A reason that stands by itself: a circumstance or a piece of evidence. */
export type PlainReason = CircumstanceKind | ClueId;
/** What a player can name as a reason to rule a person out. */
export type ReasonId = PlainReason | SayId;

export function isSay(reason: string): reason is SayId {
  return /^say:\d+$/.test(reason);
}

export const sayOf = (speaker: number): SayId => `say:${speaker}`;
export const speakerOf = (reason: SayId): number => Number(reason.slice(4));

/** The reasons of a case, in the order of the screen: circumstances, evidence, statements. */
export function reasonsOf(def: CaseDef): ReasonId[] {
  return [...def.circumstances.map((c) => c.kind), ...def.clues, ...def.statements.map((_, i) => sayOf(i))];
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

/** Whether a circumstance or a piece of evidence rules this suspect out, and if not — why not. */
export function check(def: CaseDef, suspect: number, reason: PlainReason): Check {
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

/**
 * Whether these people's statements can all be true if `culprit` did it: the one who did it was at the
 * scene, everybody else at one of the places. The statements of `culprit` are not asked: they lie.
 */
export function statementsHold(def: CaseDef, culprit: number, speakers: readonly number[]): boolean {
  const said = speakers.filter((s) => s !== culprit && def.statements[s]);
  if (said.length === 0) return true;
  const people = def.suspects.map((_, i) => i).filter((i) => i !== culprit);
  const where = new Map<number, PlaceId | null>([[culprit, null]]);
  const holds = (): boolean =>
    said.every((s) => {
      const st = def.statements[s] as (typeof def.statements)[number];
      return where.get(s) === st.at && (st.saw ?? []).every((o) => where.get(o) === st.at) && (st.notSaw ?? []).every((o) => where.get(o) !== st.at);
    });
  const place = (n: number): boolean => {
    const person = people[n];
    if (person === undefined) return holds();
    for (const p of PLACES) {
      where.set(person, p);
      if (place(n + 1)) return true;
    }
    return false;
  };
  return place(0);
}

export type Proof =
  /** A circumstance or a piece of evidence rules the person out. */
  | { excludes: true; by: 'reason'; reason: PlainReason }
  /** Somebody else's statement gives the person an alibi. */
  | { excludes: true; by: 'vouched'; speaker: number }
  /** Two other people's statements cannot both be true: one of those two did it. */
  | { excludes: true; by: 'clash'; a: number; b: number }
  | Exclude<Check, { excludes: true }>
  /** own — the person's own statement proves nothing; possible — all of it can be true even if they did it. */
  | { excludes: false; why: 'own' | 'possible' };

/** Whether the reasons a player names rule this suspect out — one of them alone, or the statements together. */
export function prove(def: CaseDef, suspect: number, picked: readonly ReasonId[]): Proof {
  if (!def.suspects[suspect]) throw new Error(`No suspect ${suspect} in the case ${def.id}`);
  const plain = picked.filter((r): r is PlainReason => !isSay(r));
  const said = picked.filter(isSay).map(speakerOf);
  for (const reason of plain) if (check(def, suspect, reason).excludes) return { excludes: true, by: 'reason', reason };
  const others = said.filter((s) => s !== suspect);
  for (const speaker of others) if (!statementsHold(def, suspect, [speaker])) return { excludes: true, by: 'vouched', speaker };
  const [a, b] = others;
  if (a !== undefined && b !== undefined && !statementsHold(def, suspect, others)) return { excludes: true, by: 'clash', a, b };
  const only = picked.length === 1 ? plain[0] : undefined;
  if (only !== undefined) return check(def, suspect, only) as Exclude<Check, { excludes: true }>;
  return { excludes: false, why: said.includes(suspect) ? 'own' : 'possible' };
}

/** The single reasons that rule this suspect out, in the order of the screen. */
export function excludedBy(def: CaseDef, suspect: number, reasons: readonly ReasonId[] = reasonsOf(def)): ReasonId[] {
  return reasons.filter((reason) => prove(def, suspect, [reason]).excludes);
}

/**
 * The plainest way to rule a suspect out, for the end of a case: a circumstance or evidence; else a statement
 * of an honest person; else any statement; else two statements that clash. null — nothing rules them out.
 */
export function bestProof(def: CaseDef, suspect: number): ReasonId[] | null {
  const reasons = reasonsOf(def);
  const single = (ok: (r: ReasonId) => boolean) => reasons.find((r) => ok(r) && prove(def, suspect, [r]).excludes);
  const one = single((r) => !isSay(r)) ?? single((r) => isSay(r) && speakerOf(r) !== def.culprit) ?? single(() => true);
  if (one !== undefined) return [one];
  const said = reasons.filter(isSay);
  for (const a of said) for (const b of said) if (speakerOf(a) < speakerOf(b) && prove(def, suspect, [a, b]).excludes) return [a, b];
  return null;
}

/** Suspects the reasons do not rule out: each reason alone, and all the statements together. */
export function candidates(def: CaseDef, reasons: readonly ReasonId[] = reasonsOf(def)): number[] {
  const plain = reasons.filter((r): r is PlainReason => !isSay(r));
  const speakers = reasons.filter(isSay).map(speakerOf);
  return def.suspects.map((_, i) => i).filter((i) => plain.every((r) => !check(def, i, r).excludes) && statementsHold(def, i, speakers));
}

/** Suspects every piece of evidence fits, taken at face value: the answer of a hasty reader. */
export function atFaceValue(def: CaseDef): number[] {
  return def.suspects.map((_, i) => i).filter((i) => def.clues.every((clue) => fits(traitsOf(def.suspects[i] as (typeof def.suspects)[number]), clue)));
}

/** Pairs of people whose statements cannot both be true, whoever of the others did it. */
export function clashes(def: CaseDef): [number, number][] {
  const out: [number, number][] = [];
  const people = def.suspects.map((_, i) => i);
  for (const a of people) {
    for (const b of people) {
      if (a < b && people.filter((c) => c !== a && c !== b).every((c) => !statementsHold(def, c, [a, b]))) out.push([a, b]);
    }
  }
  return out;
}

/** What is wrong with a case as a puzzle; empty — it is fair. */
export function puzzleProblems(def: CaseDef): string[] {
  const out: string[] = [];
  const reasons = reasonsOf(def);
  const plain = reasons.filter((r): r is PlainReason => !isSay(r));
  const left = candidates(def);
  if (left.length !== 1 || left[0] !== def.culprit) out.push(`the reasons leave ${JSON.stringify(left)}, not only the one who did it (${def.culprit})`);
  if (new Set(reasons).size !== reasons.length) out.push('a reason is given twice');
  const leads = falseLeads(def);
  for (const c of def.circumstances) {
    if (c.kind === 'time' && !def.things.some((p) => p.thing === c.thing)) out.push(`the ${c.thing} that tells the time is not among the things`);
  }
  def.facts.forEach((facts, i) => {
    for (const f of facts) if (f.kind === 'away' && f.from >= f.to) out.push(`suspect ${i}: an alibi that ends before it starts`);
  });
  if (def.facts.length > def.suspects.length) out.push('facts about more people than there are suspects');
  def.suspects.forEach((_, i) => {
    if (i !== def.culprit && !bestProof(def, i)) out.push(`suspect ${i} cannot be ruled out with ${DETECTIVE.reasonsAtOnce} reasons at most`);
  });

  if (def.level === 'hard') {
    // statements decide, evidence is needed too, and there is a clash to find
    if (def.statements.length !== def.suspects.length) out.push('a hard case needs a statement from every suspect');
    if (!def.circumstances.some((c) => c.kind === 'time')) out.push('a hard case needs the time the statements speak of');
    def.statements.forEach((st, i) => {
      const named = [...(st.saw ?? []), ...(st.notSaw ?? [])];
      if (named.some((o) => o === i || !def.suspects[o])) out.push(`suspect ${i}: a statement about themselves or about nobody`);
      if (new Set(named).size !== named.length) out.push(`suspect ${i}: a statement names a person twice`);
    });
    if (candidates(def, plain).length < 2) out.push('the evidence alone names the one who did it: no statement is needed');
    if (candidates(def, reasons.filter(isSay)).length < 2) out.push('the statements alone name the one who did it: no evidence is needed');
    for (const reason of plain) {
      if (def.circumstances.some((c) => c.kind === reason && c.kind === 'time') && !def.facts.some((f) => f.some((x) => x.kind === 'away'))) continue;
      if (candidates(def, plain.filter((r) => r !== reason)).length <= candidates(def, plain).length) out.push(`"${reason}" rules out nobody the rest of the evidence does not`);
    }
    if (!clashes(def).some(([a, b]) => a === def.culprit || b === def.culprit)) out.push('no statement clashes with the lie of the one who did it');
    return out;
  }

  if (def.statements.length > 0) out.push('only a hard case has statements');
  for (const reason of reasons) {
    if (leads.some((l) => l.clue === reason)) continue;
    if (candidates(def, reasons.filter((r) => r !== reason)).length <= 1) out.push(`"${reason}" is not needed: without it the same person is left`);
  }
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
