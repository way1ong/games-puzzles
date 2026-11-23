// A small helper to build elements without innerHTML.
type Attrs = Record<string, string | number | boolean | null | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') el.className = String(value);
    else el.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/**
 * An SVG element from its text. Only for drawings the game makes itself (its own numbers and colours):
 * never for text that comes from a player or from outside.
 */
export function svg(markup: string): SVGSVGElement {
  const holder = document.createElement('template');
  holder.innerHTML = markup;
  const el = holder.content.firstElementChild;
  if (!(el instanceof SVGSVGElement)) throw new Error('Not an SVG drawing');
  return el;
}
