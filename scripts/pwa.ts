// Install and offline for each game (build only): the web app manifest, the icons and a service worker
// that keeps this build's files, so the game opens without internet. No library: the worker is
// scripts/sw-template.js with this build's version and file list filled in.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import type { Plugin, Rolldown } from 'vite';

type OutputBundle = Rolldown.OutputBundle;
type OutputChunk = Rolldown.OutputChunk;

export interface GameApp {
  /** Folder under games/; the game is served at /<game>/. */
  game: string;
  /** Name on the home screen and in the app list; short name under the icon. */
  name: string;
  shortName: string;
  description: string;
  /** Language of the manifest's texts. */
  lang: string;
}

/** A colour token of the light theme from games/<game>/styles/tokens.css. */
function lightToken(root: string, game: string, name: string): string {
  const css = readFileSync(join(root, 'games', game, 'styles', 'tokens.css'), 'utf8');
  const start = css.indexOf(':root {');
  const block = css.slice(start, css.indexOf('}', start));
  const value = block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();
  if (!value) throw new Error(`No ${name} in games/${game}/styles/tokens.css`);
  return value;
}

/** The entry chunk of a game and everything it pulls in: its code, imported code, styles and assets. */
function filesOf(bundle: OutputBundle, game: string): string[] {
  const entry = Object.values(bundle).find((f): f is OutputChunk => f.type === 'chunk' && f.isEntry && f.name === game);
  if (!entry) throw new Error(`No entry chunk "${game}" in the bundle`);
  const files = new Set<string>();
  const visit = (chunk: OutputChunk) => {
    if (files.has(chunk.fileName)) return;
    files.add(chunk.fileName);
    for (const css of chunk.viteMetadata?.importedCss ?? []) files.add(css);
    for (const asset of chunk.viteMetadata?.importedAssets ?? []) files.add(asset);
    for (const name of chunk.imports) {
      const next = bundle[name];
      if (next?.type === 'chunk') visit(next);
    }
  };
  visit(entry);
  return [...files];
}

export function gameApps(root: string, apps: GameApp[]): Plugin {
  const byPath = new Map(apps.map((app) => [`/${app.game}/index.html`, app]));
  return {
    name: 'way1ong-game-apps',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!byPath.has(ctx.path)) return html;
        return {
          html,
          tags: [
            { tag: 'link', attrs: { rel: 'manifest', href: 'manifest.webmanifest' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'icon', href: 'icons/icon.svg', type: 'image/svg+xml' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' }, injectTo: 'head' },
          ],
        };
      },
    },
    writeBundle(options, bundle) {
      const out = options.dir;
      if (!out) throw new Error('No output folder');
      const template = readFileSync(join(root, 'scripts', 'sw-template.js'), 'utf8');
      for (const app of apps) {
        const dir = join(out, app.game);
        mkdirSync(join(dir, 'icons'), { recursive: true });
        const icons = readdirSync(join(root, 'games', app.game, 'icons'));
        for (const icon of icons) copyFileSync(join(root, 'games', app.game, 'icons', icon), join(dir, 'icons', icon));

        const manifest = {
          id: './',
          start_url: './',
          scope: './',
          name: app.name,
          short_name: app.shortName,
          description: app.description,
          lang: app.lang,
          dir: 'ltr',
          display: 'standalone',
          background_color: lightToken(root, app.game, '--bg'),
          theme_color: lightToken(root, app.game, '--bg'),
          categories: ['games'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        };
        writeFileSync(join(dir, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);

        // Paths relative to /<game>/, where the worker lives.
        const files = [
          `${app.game}/index.html`,
          `${app.game}/manifest.webmanifest`,
          ...icons.map((icon) => `${app.game}/icons/${icon}`),
          ...filesOf(bundle, app.game),
        ];
        // The version changes with any kept file and with the worker's own code.
        const hash = createHash('sha256').update(template);
        for (const file of files) hash.update(file).update(readFileSync(join(out, file)));
        const version = hash.digest('hex').slice(0, 12);
        const relative = files.map((file) => posix.relative(app.game, file));
        const worker = template
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace('__FILES__', JSON.stringify(relative))
          .replace("'__CACHE_PREFIX__'", JSON.stringify(`way1ong-${app.game}-`));
        writeFileSync(join(dir, 'sw.js'), worker);
        this.info?.(`${app.game}: service worker ${version}, ${files.length} files`);
      }
    },
  };
}
