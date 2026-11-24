// The harder levels in words: what is known about a person, what they say, what the scene says, the reasons
// a player can name, and what the game answers to them (core/deduction.ts decides, this file only says it).
import type { CaseDef } from '../core/cases.ts';
import { factsOf, isSay, reasonsOf, sayOf, speakerOf, type Proof, type ReasonId } from '../core/deduction.ts';
import { alibis, awayAt, hasKey, visitOf, type Circumstance } from '../core/facts.ts';
import type { ThingId } from '../core/things.ts';
import { isClue } from '../core/traits.ts';
import { fmt, type Dict } from './i18n.ts';
import { timeText } from './time.ts';

const nameOf = (d: Dict, def: CaseDef, suspect: number) => d.people[(def.suspects[suspect] as (typeof def.suspects)[number]).person].name;

/** The moment the case speaks of, in words; '' — the case has none. */
function momentOf(lang: string, def: CaseDef): string {
  const time = def.circumstances.find((c) => c.kind === 'time');
  return time?.kind === 'time' ? timeText(lang, time.at) : '';
}

/** Whether anybody in the case has an alibi as a fact (then the time is a reason by itself). */
const hasAlibis = (def: CaseDef) => def.facts.some((facts) => alibis(facts).length > 0);

/**
 * What is known about a suspect beyond the looks — each said outright: the key where the lock matters, a
 * daytime visit, the alibi where people do not speak for themselves.
 */
export function factLines(d: Dict, lang: string, def: CaseDef, suspect: number): string[] {
  const facts = factsOf(def, suspect);
  const out: string[] = [];
  if (def.circumstances.some((c) => c.kind === 'locked')) out.push(hasKey(facts) ? d.facts.key : d.facts.noKey);
  const visit = visitOf(facts);
  if (visit) out.push(fmt(d.facts.visit, { why: d.visits[visit] }));
  const away = alibis(facts);
  for (const a of away) out.push(fmt(d.facts.alibi, { from: timeText(lang, a.from), to: timeText(lang, a.to), where: d.away[a.where] }));
  if (away.length === 0 && def.statements.length === 0 && def.circumstances.some((c) => c.kind === 'time')) out.push(d.facts.noAlibi);
  return out;
}

/** What a suspect says about the moment it happened; '' — nothing (not a hard case). */
export function statementText(d: Dict, lang: string, def: CaseDef, suspect: number): string {
  const person = def.suspects[suspect]?.person;
  if (!def.statements[suspect] || !def.story || !person) return '';
  const says = (d.stories as Record<string, { says?: Record<string, string> }>)[def.story]?.says;
  return fmt(says?.[person] ?? '', { time: momentOf(lang, def) });
}

export interface CircumstanceText {
  /** The thing whose picture stands for it. */
  icon: ThingId;
  name: string;
  text: string;
}

export function circumstanceText(d: Dict, lang: string, c: Circumstance): CircumstanceText {
  if (c.kind === 'locked') return { icon: 'key', name: d.circumstances.locked.name, text: d.circumstances.locked.text };
  return { icon: c.thing, name: fmt(d.circumstances.time.name, { time: timeText(lang, c.at) }), text: d.circumstances.time.text };
}

export interface ReasonText {
  id: ReasonId;
  label: string;
  /** A second line: the words of a statement. */
  line: string;
  /** The thing whose picture stands for the reason; null — a statement, it has none. */
  icon: ThingId | null;
}

/**
 * The reasons as a player picks them: circumstances, evidence, statements. The time is left out where nobody
 * has an alibi as a fact: there it rules out nobody by itself, the statements speak of it.
 */
export function reasonChoices(d: Dict, lang: string, def: CaseDef): ReasonText[] {
  const out: ReasonText[] = [];
  for (const id of reasonsOf(def)) {
    if (isSay(id)) out.push({ id, label: fmt(d.suspects.says, { name: nameOf(d, def, speakerOf(id)) }), line: statementText(d, lang, def, speakerOf(id)), icon: null });
    else if (isClue(id)) out.push({ id, label: d.things[id], line: '', icon: id });
    else {
      const c = def.circumstances.find((item) => item.kind === id);
      if (!c || (c.kind === 'time' && !hasAlibis(def))) continue;
      const text = circumstanceText(d, lang, c);
      out.push({ id, label: text.name, line: '', icon: text.icon });
    }
  }
  return out;
}

/** What the game says to "it is not this person, because of this": why the reasons hold or why they do not. */
export function rulingText(d: Dict, lang: string, def: CaseDef, suspect: number, picked: readonly ReasonId[], proof: Proof): string {
  const name = nameOf(d, def, suspect);
  const at = momentOf(lang, def);
  const clue = (reason: ReasonId | undefined) => d.things[reason as ThingId] ?? '';
  if (!proof.excludes) {
    if (proof.why === 'hasKey') return fmt(d.rulings.hasKey, { name });
    if (proof.why === 'free') return fmt(d.rulings.free, { name, time: at });
    if (proof.why === 'visitor') return fmt(d.rulings.visitor, { clue: clue(picked[0]), visitor: nameOf(d, def, proof.visitor) });
    if (proof.why === 'fits') return fmt(d.rulings.fits, { name, clue: clue(picked[0]) });
    return fmt(proof.why === 'own' ? d.rulings.own : d.rulings.possible, { name });
  }
  if (proof.by === 'vouched') return fmt(d.rulings.vouched, { name, speaker: nameOf(d, def, proof.speaker) });
  if (proof.by === 'clash') return fmt(d.rulings.clash, { name, a: nameOf(d, def, proof.a), b: nameOf(d, def, proof.b) });
  if (isClue(proof.reason)) return fmt(d.rulings.clue, { name, clue: d.things[proof.reason] });
  if (proof.reason === 'locked') return fmt(d.rulings.locked, { name });
  const time = def.circumstances.find((c) => c.kind === 'time');
  const away = time?.kind === 'time' ? awayAt(factsOf(def, suspect), time.at) : null;
  return fmt(d.rulings.time, { name, time: at, where: away ? d.away[away.where] : '' });
}

/** Everybody's statement, for the list on the suspects' screen. */
export function statementLines(d: Dict, lang: string, def: CaseDef): { suspect: number; name: string; text: string; id: ReasonId }[] {
  return def.statements.map((_, i) => ({ suspect: i, name: nameOf(d, def, i), text: statementText(d, lang, def, i), id: sayOf(i) }));
}
