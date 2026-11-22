// "Copy result": copies a text to the clipboard; where the clipboard is not available, shows the text so it
// can be copied by hand.
import { h } from './dom.ts';

export interface ShareText {
  label: string;
  /** Shown after copying. */
  done: string;
  text: string;
}

export function copyControl(share: ShareText): { button: HTMLButtonElement; out: HTMLOutputElement } {
  const button = h('button', { class: 'btn btn--ghost', type: 'button' }, share.label);
  const out = h('output', { class: 'copy-out' });
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(share.text);
      out.textContent = share.done;
    } catch {
      out.textContent = share.text;
    }
  });
  return { button, out };
}
