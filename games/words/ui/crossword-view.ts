// The crossword on the screen. Cells of found words show their letters with a full frame; letters opened by a
// hint are marked by a dot as well as by colour; empty cells are boxes (or hidden, if the player chose so).
// While the player chooses a cell for a hint, the empty cells become buttons. Readers of the screen get the
// words as a list (which are found, which letters are open).
import { h } from '../../../shared/ui/dom.ts';
import { cellsOf } from '../core/crossword.ts';
import { cellsOfLevel, isShown, type Play } from '../core/play.ts';
import { fmt, type Dict } from './i18n.ts';

export interface CrosswordOptions {
  showCells: boolean;
  /** The player is choosing a cell to open with a hint. */
  choosing: boolean;
  /** A word found a moment ago: its cells light up. */
  justFound: string | null;
}

export interface CrosswordView {
  el: HTMLElement;
  render(play: Play, options: CrosswordOptions, d: Dict): void;
}

export function createCrosswordView(onCell: (row: number, col: number) => void): CrosswordView {
  const grid = h('div', { class: 'crossword', 'aria-hidden': 'true' });
  const list = h('ol', { class: 'visually-hidden' });
  const el = h('section', { class: 'crossword-wrap' }, grid, list);

  return {
    el,
    render(play, options, d) {
      const level = play.level;
      grid.style.setProperty('--cols', String(level.width));
      grid.style.setProperty('--rows', String(level.height));
      grid.setAttribute('aria-hidden', String(!options.choosing));
      if (options.choosing) grid.setAttribute('aria-label', d.game.crossword);
      else grid.removeAttribute('aria-label');
      el.setAttribute('aria-label', d.game.crossword);
      const cells = cellsOfLevel(level);
      const lit = new Set<string>();
      const justFound = level.words.find((p) => p.word.text === options.justFound);
      if (justFound) for (const c of cellsOf(justFound)) lit.add(`${c.row},${c.col}`);
      const items: HTMLElement[] = [];
      for (const [key, cell] of cells) {
        const shown = isShown(play, cell.row, cell.col);
        const opened = play.opened.includes(key);
        const found = cell.words.some((p) => play.found.includes(p.word.text));
        const style = `grid-row: ${cell.row + 1}; grid-column: ${cell.col + 1}`;
        const classes = ['cw-cell', shown ? 'is-shown' : 'is-empty', found ? 'is-found' : '', opened && !found ? 'is-opened' : '', lit.has(key) ? 'is-lit' : '']
          .filter(Boolean)
          .join(' ');
        if (options.choosing && !shown) {
          const b = h('button', { class: `${classes} is-choice`, type: 'button', style, 'aria-label': fmt(d.game.cell, { row: cell.row + 1, col: cell.col + 1 }) });
          b.addEventListener('click', () => onCell(cell.row, cell.col));
          items.push(b);
        } else {
          const hidden = !shown && !options.showCells;
          items.push(h('span', { class: `${classes}${hidden ? ' is-hidden' : ''}`, style }, shown ? cell.tile.toUpperCase() : ''));
        }
      }
      grid.replaceChildren(...items);

      // For readers of the screen: the words in order, with what is known of each.
      list.replaceChildren(
        ...level.words.map((p, i) => {
          const isFound = play.found.includes(p.word.text);
          const open = cellsOf(p)
            .map((c) => (isShown(play, c.row, c.col) ? c.tile : '·'))
            .join(' ');
          const state = isFound
            ? fmt(d.game.wordFound, { word: p.word.text })
            : open.includes('·') && open.replace(/[·\s]/g, '')
              ? fmt(d.game.wordOpen, { letters: open })
              : d.game.wordHidden;
          return h('li', {}, fmt(d.game.wordState, { n: i + 1, total: level.words.length, length: p.word.tiles.length, state }));
        }),
      );
    },
  };
}
