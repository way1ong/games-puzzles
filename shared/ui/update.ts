// A new version of the game (decision of 26.11). The browser fetches it by itself and it waits: the old one keeps
// serving the page in play, with all its files. The game says so on its start screen and in its menu
// (shared/ui/update-view.ts), and only the player's "Update" turns the new version on; the game then opens again
// where the player stopped (every game keeps its play as it goes). Nothing reloads by itself, so a game in play is
// never cut off. The worker's side is scripts/sw-template.js.

/** The word the page sends a waiting worker to take over; scripts/sw-template.js listens for it (update.test.ts). */
export const TAKE_OVER = 'way1ong:take-over';

let registration: ServiceWorkerRegistration | null = null;
const listeners = new Set<() => void>();

/** Whether a new version waits for the player: a worker waits and this page runs under the one before it. */
export function updateReady(): boolean {
  return !!registration?.waiting && navigator.serviceWorker.controller !== null;
}

/** Calls back each time a new version starts waiting. */
export function onUpdateReady(listener: () => void): void {
  listeners.add(listener);
}

function tell(): void {
  if (updateReady()) for (const listener of listeners) listener();
}

/** Follows the game's worker: called once it is registered (shared/ui/offline.ts). */
export function watchUpdates(reg: ServiceWorkerRegistration): void {
  registration = reg;
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') tell();
    });
  });
  // A version that already waited when the game opened (fetched on an earlier visit).
  tell();

  // The new version took over (this page's "Update", or another window of the same game): a page that ran under
  // the old one would go on with old code and new files, so it opens again. The first worker of a fresh visit
  // takes the page over too, and that is no change of version.
  let controlled = navigator.serviceWorker.controller !== null;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled && !reloading) {
      reloading = true;
      location.reload();
    }
    controlled = true;
  });

  // A phone keeps an open game for days: look for a new version each time the player comes back to it. Only this
  // game's own worker file is asked for, as the browser does on each opening; nothing is sent.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
  });
}

/** The player's "Update": the waiting version takes over, and the page opens again under it. */
export function applyUpdate(): void {
  registration?.waiting?.postMessage(TAKE_OVER);
}
