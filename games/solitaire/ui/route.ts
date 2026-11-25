// Which screen is open: the start screen or a game. On the game's own page the address keeps it (the part
// after #), so the phone's Back button returns to the start screen; inside another page's frame (a test
// page) the choice is only remembered while the page is open.
const framed = window.self !== window.top;
let memory = '';
/** How many screens the player has opened from the start screen in this visit. */
let depth = 0;

export function currentRoute(): string {
  return framed ? memory : decodeURIComponent(window.location.hash.replace(/^#/, ''));
}

export function watchRoute(onChange: () => void): void {
  if (!framed) window.addEventListener('hashchange', onChange);
  listener = onChange;
}

let listener: () => void = () => undefined;

export function openRoute(route: string): void {
  if (framed) {
    memory = route;
    listener();
    return;
  }
  depth++;
  window.location.hash = encodeURIComponent(route);
}

/** Back to the start screen. */
export function closeRoute(): void {
  if (framed) {
    memory = '';
    listener();
    return;
  }
  if (depth > 0) {
    depth--;
    window.history.back();
    return;
  }
  // The page was opened straight on a game: no start screen behind it in the history.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  listener();
}
