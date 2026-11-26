// Which screen is open: the start, a chapter of the album, a picture (of the album or of the day). On the game's own
// page the address keeps it (the part after #), so the phone's Back button goes back a screen; inside another page's
// frame (a test page) the choice is only remembered while the page is open.
const framed = window.self !== window.top;
let memory = '';
/** How many screens the player has opened in this visit (Back goes through them). */
let depth = 0;
let listener: () => void = () => undefined;

export function currentRoute(): string {
  return framed ? memory : decodeURIComponent(window.location.hash.replace(/^#/, ''));
}

export function watchRoute(onChange: () => void): void {
  if (!framed) window.addEventListener('hashchange', onChange);
  listener = onChange;
}

const address = (route: string) => (route ? `#${encodeURIComponent(route)}` : window.location.pathname + window.location.search);

export function openRoute(route: string): void {
  if (framed) {
    memory = route;
    listener();
    return;
  }
  depth++;
  window.location.hash = encodeURIComponent(route);
}

/** Another screen in this one's place (the next picture): Back still leads where it led. */
export function replaceRoute(route: string): void {
  if (!framed) window.history.replaceState(null, '', address(route));
  memory = route;
  listener();
}

/** Opens a screen with another behind it (the picture open last time, its chapter behind): Back leads there. */
export function restoreRoute(behind: string, route: string): void {
  if (!framed) {
    window.history.replaceState(null, '', address(behind));
    window.history.pushState(null, '', address(route));
    depth = 1;
  }
  memory = route;
  listener();
}

/** Back a screen: where the player came from, or — when the page opened straight here — the given screen. */
export function closeRoute(parent: string): void {
  if (framed) {
    memory = parent;
    listener();
    return;
  }
  if (depth > 0) {
    depth--;
    window.history.back();
    return;
  }
  window.history.replaceState(null, '', address(parent));
  listener();
}
