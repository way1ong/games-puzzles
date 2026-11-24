// The end of a case: who it was and why (every piece of evidence with the people it fits), how the story
// ends, how it went; for the case of the day — the days in a row and "copy result".
import { copyControl, type ShareText } from '../../../shared/ui/copy.ts';
import { h, svg } from '../../../shared/ui/dom.ts';
import { portraitSvg } from '../art/people/portrait.ts';
import type { CaseDef, StoryId } from '../core/cases.ts';
import { falseLeads, prove } from '../core/deduction.ts';
import { visitOf } from '../core/facts.ts';
import { eliminations, solution, tries, type Progress } from '../core/game.ts';
import { rulingText } from './deduction-text.ts';
import { fmt, type Dict } from './i18n.ts';

interface Action {
  label: string;
  action: () => void;
}

export interface ResultExtras {
  /** The case of the day: days in a row, what to copy. */
  streak: string | null;
  share: ShareText | null;
  /** The language of the screen: times in the reasons of a harder case. */
  lang: string;
  /** A quieter button ("Play again", "Once more"); null — none. */
  secondary: Action | null;
  primary: Action;
}

/** "Named at the first try" or "Tries: 3". */
export function triesLine(d: Dict, progress: Progress): string {
  return tries(progress) === 1 ? d.result.firstTry : fmt(d.result.tries, { n: tries(progress) });
}

/** A harder case: "Every reason right" or "Wrong reasons: 2". */
export function slipsLine(d: Dict, progress: Progress): string {
  return progress.slips === 0 ? d.result.noSlips : fmt(d.result.slips, { n: progress.slips });
}

export function hintsLine(d: Dict, progress: Progress): string {
  return progress.hints === 0 ? d.result.noHints : fmt(d.result.hints, { n: progress.hints });
}

function buttons(extras: ResultExtras, body: HTMLElement): HTMLElement {
  const actions = h('div', { class: 'actions' });
  if (extras.share) {
    const copy = copyControl(extras.share);
    actions.append(copy.button);
    body.append(copy.out);
  }
  const button = (a: Action, kind: string) => {
    const b = h('button', { class: `btn ${kind}`, type: 'button' }, a.label);
    b.addEventListener('click', a.action);
    return b;
  };
  if (extras.secondary) actions.append(button(extras.secondary, 'btn--ghost'));
  actions.append(button(extras.primary, 'btn--primary'));
  return actions;
}

export function resultView(d: Dict, def: CaseDef, progress: Progress, extras: ResultExtras): HTMLElement {
  const body = h('section', { class: 'result' });
  if (def.kind === 'search') {
    body.append(h('h2', { class: 'result__title' }, d.result.searchDone), h('p', { class: 'result__numbers' }, hintsLine(d, progress)));
    body.append(buttons(extras, body));
    return body;
  }
  const culprit = def.suspects[def.culprit];
  if (!culprit) return body;
  const name = d.people[culprit.person].name;
  const picture = h('div', { class: 'person-card__picture' });
  picture.append(svg(portraitSvg(culprit, {}, 'big')));
  const nameOf = (i: number) => d.people[(def.suspects[i] as (typeof def.suspects)[number]).person].name;
  const easy = def.level === 'easy';
  const why = h('ul', { class: 'result__why' });
  if (easy) {
    for (const { clue, who } of solution(def)) {
      why.append(h('li', {}, fmt(d.result.line, { clue: d.things[clue], trait: d.traits[clue], names: who.map(nameOf).join(', ') })));
    }
  } else {
    // everybody else with the reason that rules them out, then whose the false lead was
    for (const { suspect, picked } of eliminations(def)) why.append(h('li', {}, rulingText(d, extras.lang, def, suspect, picked, prove(def, suspect, picked))));
    for (const { clue, visitor } of falseLeads(def)) {
      const visit = visitOf(def.facts[visitor] ?? []);
      why.append(h('li', {}, fmt(d.result.falseLead, { clue: d.things[clue], visitor: nameOf(visitor), why: visit ? d.visits[visit] : '' })));
    }
    if (def.statements.length > 0) why.append(h('li', {}, fmt(d.result.liar, { name })));
  }
  body.append(
    h('div', { class: 'person-card' }, picture, h('div', {}, h('h2', { class: 'result__title' }, d.result.solved), h('p', { class: 'result__who' }, fmt(d.result.who, { name })))),
    why,
    h('p', { class: 'result__only' }, fmt(easy ? d.result.only : d.result.left, { name })),
    h('p', { class: 'result__ending' }, fmt(d.stories[def.story as StoryId].ending, { name })),
    h('p', { class: 'result__numbers' }, `${easy ? triesLine(d, progress) : slipsLine(d, progress)} · ${hintsLine(d, progress)}`),
  );
  if (extras.streak) body.append(h('p', { class: 'result__streak' }, extras.streak));
  if (def.kind === 'daily') body.append(h('p', { class: 'result__note' }, d.result.comeBack));
  body.append(buttons(extras, body));
  return body;
}
