// End of a picture: the picture in colour and its name, hints and time; for the picture of the day — the streak and
// "Copy result".
import { copyControl, type ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';

interface Action {
  label: string;
  action: () => void;
}

export interface EndContent {
  title: string;
  /** The picture's name. */
  highlight: string;
  picture: SVGSVGElement;
  lines: string[];
  share: ShareText | null;
  secondary: Action | null;
  primary: Action;
}

export function createEndDialog(): { el: HTMLDialogElement; open(content: EndContent): void } {
  const el = h('dialog', { class: 'dialog dialog--end', 'aria-labelledby': 'end-title' });

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
      const body = h(
        'div',
        { class: 'dialog__body' },
        h('h2', { id: 'end-title' }, content.title),
        h('div', { class: 'end__picture' }, content.picture),
        h('p', { class: 'dialog__highlight' }, content.highlight),
      );
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
