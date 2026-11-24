// End of a level: words, bonus words, hints, time; for the daily puzzle — the streak and "copy result".
import { copyControl, type ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';

interface Action {
  label: string;
  action: () => void;
}

export interface EndContent {
  title: string;
  lines: string[];
  highlight: string | null;
  share: ShareText | null;
  /** A quieter second button (e.g. "Close" next to "New game"). */
  secondary: Action | null;
  primary: Action;
}

export function createEndDialog(): { el: HTMLDialogElement; open(content: EndContent): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'end-title' });

  const button = (a: Action, kind: string) => {
    const b = h('button', { class: `btn ${kind}`, type: 'button' }, a.label);
    b.addEventListener('click', () => {
      el.close();
      a.action();
    });
    return b;
  };

  return {
    el,
    open(content) {
      const body = h('div', { class: 'dialog__body' }, h('h2', { id: 'end-title' }, content.title));
      if (content.highlight) body.append(h('p', { class: 'dialog__highlight' }, content.highlight));
      for (const line of content.lines) body.append(h('p', {}, line));
      const actions = h('div', { class: 'dialog__actions' });
      if (content.share) {
        const copy = copyControl(content.share);
        actions.append(copy.button);
        body.append(copy.out);
      }
      if (content.secondary) actions.append(button(content.secondary, 'btn--ghost'));
      const primary = button(content.primary, 'btn--primary');
      actions.append(primary);
      body.append(actions);
      el.replaceChildren(body);
      if (!el.open) el.showModal();
      primary.focus();
    },
  };
}
