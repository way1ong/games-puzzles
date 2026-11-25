// Downloads the sources of the word lists at their pinned versions (scripts/words/sources.ts) into
// node_modules/.cache/words-sources. Uses git, curl and unzip from the system (they follow the network's
// proxy settings). Only data is fetched and unpacked; nothing from it is run.
//   npm run words:fetch
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SOURCES, sourceDir, type SourceId } from './sources.ts';

function run(command: string, args: string[], cwd?: string): void {
  const r = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
}

for (const [id, source] of Object.entries(SOURCES) as [SourceId, (typeof SOURCES)[SourceId]][]) {
  const dir = sourceDir(id);
  const stamp = join(dir, '.fetched');
  if (existsSync(stamp)) {
    console.log(`${id}: already here`);
    continue;
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const where = source.where;
  if (where.kind === 'git') {
    run('git', ['init', '--quiet'], dir);
    run('git', ['fetch', '--quiet', '--depth', '1', where.repo, where.commit], dir);
    run('git', ['checkout', '--quiet', 'FETCH_HEAD'], dir);
  } else {
    run('curl', ['--fail', '--silent', '--show-error', '--location', '--output', 'source.zip', where.url], dir);
    run('unzip', ['-q', '-o', 'source.zip'], dir);
  }
  run('touch', ['.fetched'], dir);
  console.log(`${id}: fetched`);
}
