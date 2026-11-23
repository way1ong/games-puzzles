// Games side by side on one address (/blocks/, /detective/): what makes each of them an app of its own.
// A browser tells installed apps apart by identity: two games with one identity install as one app, and
// the second takes the place of the first. Each game also keeps its files in a store of its own and, when
// it updates, removes its older stores by the beginning of their name — so no game's store name may begin
// like another's. The build stops on either (scripts/pwa.ts); the browser audit asks the browser itself.

/** The members of a web app manifest that say which app it is and where it lives. */
export interface AppAddress {
  /** Read against the address of the SITE, not of the manifest — unlike start_url and scope. */
  id?: string;
  start_url: string;
  scope: string;
}

export interface AppUrls {
  /** The identity of the installed app. */
  id: string;
  start: string;
  scope: string;
}

/** The files of a game's version are kept in the store named `<prefix><version>`. */
export function storePrefix(game: string): string {
  return `way1ong-${game}-`;
}

/** How a browser reads the manifest served at `manifestUrl` (the rules of the Web Application Manifest). */
export function appUrls(manifest: AppAddress, manifestUrl: string): AppUrls {
  const start = new URL(manifest.start_url, manifestUrl);
  const scope = new URL(manifest.scope, manifestUrl);
  // Without an id of its own (or with one that leads to another site) the app is known by its start address.
  const id = new URL(start);
  if (manifest.id) {
    try {
      const own = new URL(manifest.id, start.origin);
      if (own.origin === start.origin) id.href = own.href;
    } catch {
      // not an address: the start address stays
    }
  }
  id.hash = '';
  return { id: id.href, start: start.href, scope: scope.href };
}

/**
 * Why these games could not be installed and kept side by side on one address; empty — they can.
 * Every game is served from its own folder: `/<game>/manifest.webmanifest`.
 */
export function appProblems(apps: { game: string; manifest: AppAddress }[]): string[] {
  const out: string[] = [];
  const read = apps.map(({ game, manifest }) => ({
    game,
    store: storePrefix(game),
    ...appUrls(manifest, `https://games.example/${game}/manifest.webmanifest`),
  }));
  for (const app of read) {
    if (!app.start.startsWith(app.scope)) out.push(`${app.game}: the start address ${app.start} is outside the scope ${app.scope}`);
    if (!app.id.startsWith(app.scope)) {
      out.push(`${app.game}: the app identity ${app.id} is outside the game's folder ${app.scope} — an "id" in the manifest is read against the site's address`);
    }
  }
  for (const [i, a] of read.entries()) {
    for (const b of read.slice(i + 1)) {
      if (a.id === b.id) out.push(`${a.game} and ${b.game} have one app identity ${a.id}: installed, the second would replace the first`);
      if (a.scope.startsWith(b.scope) || b.scope.startsWith(a.scope)) out.push(`${a.game} and ${b.game}: the scope of one lies inside the other's (${a.scope}, ${b.scope})`);
      for (const [inner, outer] of [
        [a, b],
        [b, a],
      ] as const) {
        if (inner.store.startsWith(outer.store)) {
          out.push(`the store name of ${inner.game} (${inner.store}…) begins like the one of ${outer.game} (${outer.store}…): updating, ${outer.game} would remove the files of ${inner.game}`);
        }
      }
    }
  }
  return out;
}
