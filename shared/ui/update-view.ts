// What the player sees of a new version (decision of 26.11, option A): a question on the start screen, once per
// opening of the game, never in play and never over another window, so nothing on the screen moves; and a line at
// the top of the menu while the new version waits. Texts come from the game's dictionary ("update").
import { h } from './dom.ts';
import { applyUpdate, onUpdateReady, updateReady } from './update.ts';

export interface UpdateTexts {
  title: string;
  text: string;
  apply: string;
  later: string;
}

/** The player has been told in this opening of the game (the question, or the line in the menu): no question again. */
let told = false;

function applyButton(texts: UpdateTexts): HTMLButtonElement {
  const b = h('button', { class: 'btn btn--primary', type: 'button' }, texts.apply);
  b.addEventListener('click', () => {
    b.disabled = true;
    applyUpdate();
  });
  return b;
}

/** The line at the top of the menu; null while no new version waits. */
export function updateLine(texts: UpdateTexts): HTMLElement | null {
  if (!updateReady()) return null;
  told = true;
  return h('div', { class: 'update-line' }, h('p', { class: 'update-line__text' }, texts.title), applyButton(texts));
}

/**
 * The start screen's question. `home` tells whether the player is on the start screen; the game calls `check()`
 * each time it draws it, and the question also comes by itself when a new version starts waiting there.
 */
export function offerUpdates(home: () => boolean, texts: () => UpdateTexts): { check(): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'update-title' });
  document.body.append(el);

  function check(): void {
    if (told || !updateReady() || !home() || document.querySelector('dialog[open]')) return;
    told = true;
    const t = texts();
    const later = h('button', { class: 'btn btn--ghost', type: 'button' }, t.later);
    later.addEventListener('click', () => el.close());
    const apply = applyButton(t);
    el.replaceChildren(
      h(
        'div',
        { class: 'dialog__body' },
        h('h2', { id: 'update-title' }, t.title),
        h('p', {}, t.text),
        h('div', { class: 'dialog__actions' }, later, apply),
      ),
    );
    el.showModal();
    apply.focus();
  }

  onUpdateReady(check);
  return { check };
}
