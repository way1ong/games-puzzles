// Makes the set of "Clear the way" puzzles (docs/slide/SPEC.md, "Головоломки складено заздалегідь"):
// games/slide/levels/unblock.txt. From each random board it takes the hardest start — the position farthest from the
// way out among all the board can reach — with its fewest moves. Board i always comes from seed i, so the set is the
// same on any computer, whatever the number of threads. The file only grows: puzzles in it keep their lines and
// order, new ones go to the end (levels and days stay the same after an update). Committed; run again only to change
// the set (e.g. after raising SLIDE.pool.boards).
//   npm run slide:pool
//   npm run slide:pool -- --boards=2000 --out=<file>   a quick try: fewer boards, another file
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { nextInt, seedFromText } from '../../shared/core/rng.ts';
import { SLIDE } from '../../games/slide/config.ts';
import { randomBoard } from '../../games/slide/core/boards.ts';
import { parsePool, poolLine, type PoolPuzzle } from '../../games/slide/core/pool.ts';
import { allPositions, hardest } from '../../games/slide/core/unblock-solve.ts';

const option = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = option('out') ?? 'games/slide/levels/unblock.txt';
const BOARDS = Number(option('boards') ?? SLIDE.pool.boards);
/** Boards between the lines that tell how far the work is. */
const REPORT_EVERY = 10_000;

interface Found {
  seed: number;
  moves: number;
  text: string;
  sparse: boolean;
}

/** The hardest start of board `seed`; null when the board has too many positions or no start worth a level. */
function fromBoard(seed: number): Found | null {
  const { sparseEvery, sparsePieces, densePieces, longShare } = SLIDE.pool;
  const sparse = seed % sparseEvery === 0;
  const [least, most] = sparse ? sparsePieces : densePieces;
  const draw = nextInt(seedFromText(`way1ong-slide:board:${seed}`), most - least + 1);
  const { puzzle, places } = randomBoard(draw.state, least + draw.value, longShare);
  const positions = allPositions(puzzle, places, SLIDE.unblock.maxPositions);
  const top = positions && hardest(positions);
  if (!top || top.moves < SLIDE.unblock.stages[0]!.moves[0]) return null;
  return { seed, moves: top.moves, text: top.text, sparse };
}

if (isMainThread) {
  const started = performance.now();
  const threads = Math.max(1, availableParallelism());
  const results = await Promise.all(
    Array.from(
      { length: threads },
      (_, t) =>
        new Promise<Found[]>((done, fail) => {
          const worker = new Worker(new URL(import.meta.url), { workerData: { t, threads, boards: BOARDS }, execArgv: ['--experimental-strip-types', '--no-warnings'] });
          worker.on('message', (m: { found?: Found[]; boards?: number }) => {
            if (m.found) done(m.found);
            else if (t === 0) console.log(`${m.boards! * threads} boards…`);
          });
          worker.on('error', fail);
        }),
    ),
  );
  const found = results.flat().sort((a, b) => a.seed - b.seed);
  const old = existsSync(OUT) ? parsePool(readFileSync(OUT, 'utf8')) : [];
  const known = new Set(old.map((p) => p.text));
  const count = new Map<number, number>();
  for (const p of old) count.set(p.moves, (count.get(p.moves) ?? 0) + 1);
  const added: PoolPuzzle[] = [];
  for (const f of found) {
    if (known.has(f.text)) continue;
    if (f.moves <= SLIDE.pool.sparseUpTo && !f.sparse) continue;
    if ((count.get(f.moves) ?? 0) >= SLIDE.pool.perMoves) continue;
    known.add(f.text);
    count.set(f.moves, (count.get(f.moves) ?? 0) + 1);
    added.push({ moves: f.moves, text: f.text });
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, [...old, ...added].map(poolLine).join('\n') + '\n');
  const summary = [...count].sort((a, b) => a[0] - b[0]).map(([moves, n]) => `${moves}:${n}`);
  console.log(`${BOARDS} boards, ${found.length} starts, ${added.length} new puzzles (${old.length + added.length} in all), ${Math.round((performance.now() - started) / 1000)} s`);
  console.log(`puzzles by fewest moves: ${summary.join(' ')}`);
} else {
  const { t, threads, boards: total } = workerData as { t: number; threads: number; boards: number };
  const found: Found[] = [];
  let boards = 0;
  for (let seed = t; seed < total; seed += threads) {
    const f = fromBoard(seed);
    if (f) found.push(f);
    if (++boards % REPORT_EVERY === 0) parentPort!.postMessage({ boards });
  }
  parentPort!.postMessage({ found });
}
