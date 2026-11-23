// The games as they are served on their real address, compared with the build in dist/:
//   npm run build && npm run check:live
// A browser must get every game's page byte for byte as it was built — nothing added on the way (Cloudflare
// adds a measuring script of its Web Analytics to the pages of a domain unless it is forbidden:
// games/public/_headers) — and the address of the games must lead to the first game.
// Needs the network; uses curl, which follows the proxy settings of the machine. Not part of the build.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES_ORIGIN } from '../shared/core/address.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
if (!GAMES_ORIGIN) {
  console.error('check-live: the games have no public address yet (shared/core/address.ts)');
  process.exit(1);
}
if (!existsSync(dist)) {
  console.error('check-live: dist/ not found — run npm run build first');
  process.exit(1);
}

// What a browser sends when it opens a page: Cloudflare changes pages only for such requests.
const AS_BROWSER = [
  '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  '--compressed',
];
/** One request: status, headers (lower-case names), body. */
function get(url) {
  const marker = '\n--check-live--\n';
  const out = execFileSync('curl', ['-sS', '-m', '30', ...AS_BROWSER, '-o', '-', '-w', `${marker}%{http_code}\n%{redirect_url}\n%header{cache-control}`, url], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  const at = out.lastIndexOf(marker);
  const [status, redirect, cacheControl] = out.subarray(at + marker.length).toString('utf8').split('\n');
  return { status: Number(status), redirect, cacheControl: cacheControl ?? '', body: out.subarray(0, at) };
}
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 12);

const problems = [];
const games = readdirSync(dist, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(dist, entry.name, 'manifest.webmanifest')))
  .map((entry) => entry.name);
if (games.length === 0) problems.push('no game in dist/');

for (const game of games) {
  const url = `${GAMES_ORIGIN}/${game}/`;
  const built = readFileSync(join(dist, game, 'index.html'));
  const live = get(url);
  if (live.status !== 200) {
    problems.push(`${url}: answer ${live.status}`);
    continue;
  }
  if (!live.body.equals(built)) {
    const added = live.body.toString('utf8').match(/<script[^>]*src="https?:\/\/[^"]+"/g) ?? [];
    problems.push(
      `${url}: the page differs from the build (${live.body.length} bytes ${sha(live.body)}, built ${built.length} bytes ${sha(built)})` +
        (added.length ? `; scripts from outside: ${added.join(' ')}` : '; another version may still be deployed'),
    );
  }
  if (!/\bno-transform\b/.test(live.cacheControl)) problems.push(`${url}: Cache-Control has no "no-transform" (${live.cacheControl || 'none'}) — games/public/_headers`);
}

const home = get(`${GAMES_ORIGIN}/`);
if (!(home.status >= 300 && home.status < 400) || !games.some((game) => home.redirect === `${GAMES_ORIGIN}/${game}/`)) {
  problems.push(`${GAMES_ORIGIN}/: expected to lead to a game, got ${home.status} ${home.redirect}`);
}

if (problems.length) {
  console.error(`check-live: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-live: OK (${GAMES_ORIGIN}: ${games.join(', ')} — served as built, nothing added on the way)`);
