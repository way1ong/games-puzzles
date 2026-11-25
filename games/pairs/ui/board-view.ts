// The table on the screen: a button for every tile, laid at its place (half tiles across and down; each layer
// lifted up and to the left, so the side of a tile shows how high it lies), the higher tiles over the lower.
// Classes carry what is shown: blocked, chosen, a hint. The size of everything follows the room the table has
// (styles/app.css). The table only shows: the game decides, the screen passes taps on.
import { h, svg } from '../../../shared/ui/dom.ts';
import { symbolId, symbolsSvg } from '../art/tiles.ts';
import { PAIRS, PICTURES } from '../config.ts';
import type { Table } from '../core/table.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface TileMarks {
  /** Which tiles can be taken now. */
  free: readonly boolean[];
  selected: number | null;
  /** The tiles a hint shows. */
  hint: readonly number[];
  /** The tile the Tab key reaches: the whole table is one stop, the arrows go on from there. */
  focus: number | null;
  /** Shade the blocked tiles (a setting). */
  dim: boolean;
}

export interface BoardView {
  el: HTMLElement;
  /** Lays out the places of a layout (once per layout opened). */
  lay(table: Table): void;
  render(kinds: readonly number[], present: readonly boolean[], marks: TileMarks, label: (i: number) => string): void;
  /** Moves the keyboard focus to the tile. */
  focus(i: number): void;
  /** Whether the keyboard focus is on a tile. */
  hasFocus(): boolean;
  /** Shakes a tile that cannot be taken (no motion when the system asks for less). */
  refuse(i: number): void;
}

interface TileParts {
  button: HTMLButtonElement;
  use: SVGUseElement;
  kind: number;
}

export function createBoardView(onTile: (i: number) => void): BoardView {
  const el = h('div', { class: 'board', role: 'group' });
  // Every picture once, for the tiles to show with <use> (the game's own drawings).
  const sprite = svg(`<svg xmlns="${SVG_NS}" class="board__sprite" aria-hidden="true" focusable="false">${symbolsSvg(PICTURES)}</svg>`);
  let tiles: TileParts[] = [];

  el.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('.tile');
    if (target?.dataset.i) onTile(Number(target.dataset.i));
  });

  return {
    el,
    lay(table) {
      const { slots } = table;
      const minX = Math.min(...slots.map((s) => s.x));
      const minY = Math.min(...slots.map((s) => s.y));
      const top = Math.max(...slots.map((s) => s.z));
      // The table's size in tiles, and its layers: the CSS works out the size of a tile from them.
      el.style.setProperty('--cols', String((Math.max(...slots.map((s) => s.x)) - minX + 2) / 2));
      el.style.setProperty('--rows', String((Math.max(...slots.map((s) => s.y)) - minY + 2) / 2));
      el.style.setProperty('--top', String(top));
      el.style.setProperty('--layers', String(top + 1));
      el.style.setProperty('--aspect', String(PAIRS.tile.height / PAIRS.tile.width));
      tiles = slots.map((s, i) => {
        const use = document.createElementNS(SVG_NS, 'use');
        const pic = document.createElementNS(SVG_NS, 'svg');
        pic.setAttribute('class', 'tile__pic');
        pic.setAttribute('viewBox', '0 0 100 100');
        pic.setAttribute('aria-hidden', 'true');
        pic.setAttribute('focusable', 'false');
        pic.append(use);
        const button = h('button', { class: 'tile', type: 'button', tabindex: -1 }, pic);
        button.dataset.i = String(i);
        button.style.setProperty('--x', String(s.x - minX));
        button.style.setProperty('--y', String(s.y - minY));
        button.style.setProperty('--z', String(s.z));
        return { button, use, kind: -1 };
      });
      // Painted from the lowest layer up; in a layer from the top left on, so that a tile's side (right and
      // below) goes under its neighbours there.
      const order = slots.map((_, i) => i).sort((a, b) => slots[a]!.z - slots[b]!.z || slots[a]!.x + slots[a]!.y - (slots[b]!.x + slots[b]!.y) || slots[a]!.x - slots[b]!.x);
      el.replaceChildren(sprite, ...order.map((i) => tiles[i]!.button));
    },
    render(kinds, present, marks, label) {
      el.classList.toggle('is-dim', marks.dim);
      for (const [i, t] of tiles.entries()) {
        const here = present[i] === true;
        t.button.hidden = !here;
        if (!here) {
          // Taken off: no marks and no Tab stop left on it for when a move is undone.
          t.button.classList.remove('is-selected', 'is-hint', 'is-refused');
          t.button.tabIndex = -1;
          continue;
        }
        const kind = kinds[i]!;
        if (t.kind !== kind) {
          t.use.setAttribute('href', `#${symbolId(PICTURES[kind]!)}`);
          t.kind = kind;
        }
        const free = marks.free[i] === true;
        const c = t.button.classList;
        c.toggle('is-blocked', !free);
        c.toggle('is-selected', marks.selected === i);
        c.toggle('is-hint', marks.hint.includes(i));
        // A free tile is chosen and unchosen like a switch; a blocked one says why when tapped.
        if (free) {
          t.button.removeAttribute('aria-disabled');
          t.button.setAttribute('aria-pressed', String(marks.selected === i));
        } else {
          t.button.setAttribute('aria-disabled', 'true');
          t.button.removeAttribute('aria-pressed');
        }
        t.button.setAttribute('aria-label', label(i));
        t.button.tabIndex = marks.focus === i ? 0 : -1;
      }
    },
    focus(i) {
      tiles[i]?.button.focus();
    },
    hasFocus() {
      return el.contains(document.activeElement);
    },
    refuse(i) {
      const b = tiles[i]?.button;
      if (!b || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      b.classList.remove('is-refused');
      void b.offsetWidth; // restart the animation
      b.classList.add('is-refused');
    },
  };
}
