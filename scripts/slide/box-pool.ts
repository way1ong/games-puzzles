// Makes the set of puzzles of "The chest" (docs/slide/SPEC.md, "Скринька", "Головоломки складено заздалегідь"):
// games/slide/levels/box.txt. Each random board gives one puzzle: the script walks every position the board can
// reach, and from the numbers of moves it offers takes the one the set has the fewest puzzles of yet (on a tie, the
// most moves), and there a position drawn from the board's seed among all of that number of moves. Never one of the
// few farthest positions of a board (where record puzzles of other makers live: SLIDE.box.pool.layerAtLeast), never a
// board of the traditional sets of blocks (SLIDE.box.pool.traditional). Board i always comes from seed i, so the set
// is the same on any computer, whatever the number of threads. The file only grows: puzzles in it keep their lines and
// order, new ones go to the end (levels and days stay the same after an update). Committed; run again only to change
// the set (e.g. after raising SLIDE.box.pool.boards).
//   npm run slide:box-pool
//   npm run slide:box-pool -- --boards=2000 --out=<file>   a quick try: fewer boards, another file
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { nextInt, nextRandom, seedFromText } from '../../shared/core/rng.ts';
import { SLIDE, type BoxShape } from '../../games/slide/config.ts';
import { plainText } from '../../games/slide/core/box.ts';
import { randomBox } from '../../games/slide/core/box-boards.ts';
import { allPositions, layersOf, textAt } from '../../games/slide/core/box-solve.ts';
import { parsePool, poolLine, type PoolPuzzle } from '../../games/slide/core/pool.ts';

const option = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = option('out') ?? 'games/slide/levels/box.txt';
const BOARDS = Number(option('boards') ?? SLIDE.box.pool.boards);
/** Boards between the lines that tell how far the work is. */
const REPORT_EVERY = 2_000;

interface Found {
  seed: number;
  /** One position (as text) at each number of moves from the first level's on (index 0); null — too few positions of it. */
  picks: (string | null)[];
  sparse: boolean;
}

/** The traditional sets of blocks: so many small ones and so many of two cells. */
function traditional(shapes: readonly BoxShape[]): boolean {
  const small = shapes.filter((s) => s === 'single').length;
  const pairs = shapes.filter((s) => s === 'lying' || s === 'standing').length;
  return SLIDE.box.pool.traditional.some(([a, b]) => a === small && b === pairs);
}

/** The positions board `seed` offers; null when the board has too many positions or nothing worth a level. */
function fromBoard(seed: number): Found | null {
  const { sparseEvery, sparseFree, denseFree, pairShare } = SLIDE.box.pool;
  const sparse = seed % sparseEvery === 0;
  let state = seedFromText(`way1ong-slide:box:board:${seed}`);
  let free: number;
  if (sparse) {
    const draw = nextInt(state, sparseFree[1] - sparseFree[0] + 1);
    state = draw.state;
    free = sparseFree[0] + draw.value;
  } else {
    const draw = nextInt(state, denseFree.length);
    state = draw.state;
    free = denseFree[draw.value]!;
  }
  const share = nextRandom(state);
  const { puzzle, spots } = randomBox(share.state, free, pairShare[0] + share.value * (pairShare[1] - pairShare[0]));
  if (traditional(puzzle.shapes)) return null;
  const positions = allPositions(puzzle, spots, SLIDE.box.maxPositions);
  if (!positions) return null;
  const layers = layersOf(positions);
  const picks: (string | null)[] = [];
  // each position drawn among all of its number of moves, in the order of their keys
  for (let moves = SLIDE.box.stages[0]!.moves[0]; moves < layers.length; moves++) {
    const layer = layers[moves]!.slice().sort((a, b) => positions.keys[a]! - positions.keys[b]!);
    if (layer.length < SLIDE.box.pool.layerAtLeast) {
      picks.push(null);
      continue;
    }
    const draw = nextInt(seedFromText(`way1ong-slide:box:pick:${seed}:${moves}`), layer.length);
    picks.push(textAt(positions, layer[draw.value]!));
  }
  return picks.some(Boolean) ? { seed, picks, sparse } : null;
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
  const known = new Set(old.map((p) => plainText(p.text)));
  const count = new Map<number, number>();
  for (const p of old) count.set(p.moves, (count.get(p.moves) ?? 0) + 1);
  const added: PoolPuzzle[] = [];
  const least = SLIDE.box.stages[0]!.moves[0];
  for (const f of found) {
    // the numbers of moves this board offers: the one the set has the fewest puzzles of, on a tie the most moves
    let best: PoolPuzzle | null = null;
    f.picks.forEach((text, i) => {
      const moves = least + i;
      if (text === null || (moves <= SLIDE.box.pool.sparseUpTo && !f.sparse)) return;
      if ((count.get(moves) ?? 0) >= SLIDE.box.pool.perMoves || known.has(text)) return;
      const n = count.get(moves) ?? 0;
      const bestN = best ? (count.get(best.moves) ?? 0) : Infinity;
      if (n < bestN || (n === bestN && moves > best!.moves)) best = { moves, text };
    });
    if (!best) continue;
    const pick: PoolPuzzle = best;
    known.add(pick.text);
    count.set(pick.moves, (count.get(pick.moves) ?? 0) + 1);
    added.push(pick);
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, [...old, ...added].map(poolLine).join('\n') + '\n');
  const summary = [...count].sort((a, b) => a[0] - b[0]).map(([moves, n]) => `${moves}:${n}`);
  console.log(`${BOARDS} boards, ${found.length} with puzzles, ${added.length} new puzzles (${old.length + added.length} in all), ${Math.round((performance.now() - started) / 1000)} s`);
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
