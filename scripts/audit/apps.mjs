// Browser audit of the games together: on one address every game must be an app of its own. The browser
// itself is asked: which identity it reads from each game's manifest (two games with one identity install as
// one app, and the second takes the place of the first), which scope, and which stores of files are kept
// after every game was opened (updating, a game removes its older stores by the beginning of their name).
import { watch } from './common.mjs';

export async function auditApps({ browser, origin, games, fail }) {
  const ctx = await browser.newContext();
  const apps = [];
  let page = null;
  for (const game of games) {
    const home = `${origin}/${game}/`;
    await page?.close();
    page = await ctx.newPage();
    watch(page, `apps ${game}`, origin, fail);
    await page.goto(home);
    // The worker becomes active only after it has kept every file of its version.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    const cdp = await ctx.newCDPSession(page);
    const { manifest, errors } = await cdp.send('Page.getAppManifest');
    for (const error of errors ?? []) fail(`apps ${game}: manifest — ${error.message}`);
    const prefix = (await (await page.request.get(`${home}sw.js`)).text()).match(/const PREFIX = "([^"]+)"/)?.[1];
    if (!manifest?.id || !manifest.scope || !prefix) {
      fail(`apps ${game}: the browser did not tell the identity and scope of the app, or the worker has no store name`);
      continue;
    }
    const app = { game, id: manifest.id, scope: manifest.scope, prefix };
    if (app.scope !== home) fail(`apps ${game}: the scope is ${app.scope}, not the game's folder ${home}`);
    if (!app.id.startsWith(home)) fail(`apps ${game}: the app identity ${app.id} is outside the game's folder ${home}`);
    for (const other of apps) {
      if (other.id === app.id) fail(`apps: ${other.game} and ${game} have one app identity ${app.id} — installed, the second would replace the first`);
      if (other.scope.startsWith(app.scope) || app.scope.startsWith(other.scope)) fail(`apps: the scope of ${other.game} or ${game} lies inside the other's`);
    }
    apps.push(app);
  }

  // Every game was opened in the same browser profile: each must have a store of its own, and no store may
  // look like an older version of another game's.
  const stores = page ? await page.evaluate(() => caches.keys()) : [];
  for (const store of stores) {
    const owners = apps.filter((app) => store.startsWith(app.prefix)).map((app) => app.game);
    if (owners.length !== 1) fail(`apps: the store ${store} is taken for its own by ${owners.length ? owners.join(' and ') : 'no game'}`);
  }
  for (const app of apps) {
    const own = stores.filter((store) => store.startsWith(app.prefix));
    if (own.length !== 1) fail(`apps ${app.game}: ${own.length} stores of files after opening every game (${stores.join(', ') || 'none'})`);
  }
  await ctx.close();
  return `the app identity, scope and store of files of ${apps.length} of ${games.length} games, as the browser reads them`;
}
