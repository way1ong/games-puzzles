// The harder levels in words: what is known about a person, what the scene says, the reasons a player can
// name, and what the game answers to a reason (core/deduction.ts decides, this file only says it).
import type { CaseDef } from '../core/cases.ts';
import { factsOf, reasonsOf, type Check, type ReasonId } from '../core/deduction.ts';
import { alibis, awayAt, hasKey, visitOf, type Circumstance } from '../core/facts.ts';
import type { ThingId } from '../core/things.ts';
import { isClue } from '../core/traits.ts';
import { fmt, type Dict } from './i18n.ts';
import { timeText } from './time.ts';

const nameOf = (d: Dict, def: CaseDef, suspect: number) => d.people[(def.suspects[suspect] as (typeof def.suspects)[number]).person].name;

/** What is known about a suspect beyond the looks: the key, a daytime visit, the alibi — each said outright. */
export function factLines(d: Dict, lang: string, def: CaseDef, suspect: number): string[] {
  const facts = factsOf(def, suspect);
  const out = [hasKey(facts) ? d.facts.key : d.facts.noKey];
  const visit = visitOf(facts);
  if (visit) out.push(fmt(d.facts.visit, { why: d.visits[visit] }));
  const away = alibis(facts);
  for (const a of away) out.push(fmt(d.facts.alibi, { from: timeText(lang, a.from), to: timeText(lang, a.to), where: d.away[a.where] }));
  if (away.length === 0) out.push(d.facts.noAlibi);
  return out;
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

/** A reason as the player picks it: the name of the circumstance or of the piece of evidence. */
export function reasonLabel(d: Dict, lang: string, def: CaseDef, reason: ReasonId): string {
  if (isClue(reason)) return d.things[reason];
  const c = def.circumstances.find((item) => item.kind === reason);
  return c ? circumstanceText(d, lang, c).name : '';
}

export function reasonChoices(d: Dict, lang: string, def: CaseDef): { id: ReasonId; label: string; icon: ThingId }[] {
  return reasonsOf(def).map((id) => {
    const c = isClue(id) ? null : def.circumstances.find((item) => item.kind === id);
    return { id, label: reasonLabel(d, lang, def, id), icon: isClue(id) ? id : c ? circumstanceText(d, lang, c).icon : 'key' };
  });
}

/** What the game says to "it is not this person, because of this": why the reason holds or why it does not. */
export function rulingText(d: Dict, lang: string, def: CaseDef, suspect: number, reason: ReasonId, check: Check): string {
  const name = nameOf(d, def, suspect);
  const time = def.circumstances.find((c) => c.kind === 'time');
  const at = time?.kind === 'time' ? timeText(lang, time.at) : '';
  if (!check.excludes) {
    if (check.why === 'hasKey') return fmt(d.rulings.hasKey, { name });
    if (check.why === 'free') return fmt(d.rulings.free, { name, time: at });
    if (check.why === 'visitor') return fmt(d.rulings.visitor, { clue: d.things[reason as ThingId], visitor: nameOf(d, def, check.visitor) });
    return fmt(d.rulings.fits, { name, clue: d.things[reason as ThingId] });
  }
  if (isClue(reason)) return fmt(d.rulings.clue, { name, clue: d.things[reason] });
  if (reason === 'locked') return fmt(d.rulings.locked, { name });
  const away = time?.kind === 'time' ? awayAt(factsOf(def, suspect), time.at) : null;
  return fmt(d.rulings.time, { name, time: at, where: away ? d.away[away.where] : '' });
}
