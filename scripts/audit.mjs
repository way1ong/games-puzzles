// Layout and accessibility check of the built games in a browser (Playwright — preinstalled in the cloud
// session): phone and computer sizes, three languages, light and dark, the large mode and large system text.
// Run after the build:  npm run audit [-- <game> ...] [--axe <path to axe.min.js>] [--shots <folder>]
// Without a game — every game (scripts/audit/<game>.mjs). With --axe the axe-core rules (WCAG 2.2 A/AA) run
// in every state too; axe-core is not a dependency of the project: download it (npm pack axe-core) into a
// scratch folder and pass the file.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAxe, createReport } from './audit/common.mjs';

const GAMES = ['blocks', 'detective'];
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const axePath = option('--axe');
const shots = option('--shots');
const games = args.length ? args : GAMES;
for (const game of games) if (!GAMES.includes(game)) throw new Error(`No audit for "${game}" (there are: ${GAMES.join(', ')})`);
if (shots) mkdirSync(shots, { recursive: true });

const PORT = 4317;
const origin = `http://localhost:${PORT}`;
const report = createReport();
const axe = createAxe(axePath ? readFileSync(axePath, 'utf8') : null);
const done = [];

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${origin}/${games[0]}/`)).ok) break;
    } catch {
      // not up yet
    }
    if (i > 100) throw new Error('vite preview did not start — run npm run build first');
    await new Promise((r) => setTimeout(r, 100));
  }
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  for (const game of games) {
    const { audit } = await import(`./audit/${game}.mjs`);
    const before = report.problems.length;
    const what = await audit({ browser, origin, axe, fail: report.fail, shots });
    done.push(`${game}: ${what}${report.problems.length === before ? '' : ` — ${report.problems.length - before} problem(s)`}`);
  }
  await browser.close();
} finally {
  server.kill();
}
console.log(report.problems.length ? `\n${report.problems.length} problem(s)` : `\nOK${axePath ? ' (with axe)' : ''}`);
for (const line of done) console.log(`  ${line}`);
process.exit(report.problems.length ? 1 : 0);
