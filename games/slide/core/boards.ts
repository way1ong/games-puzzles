// Random boards of "Clear the way" (docs/slide/SPEC.md, "Головоломки складено заздалегідь"): the raw material from
// which scripts/slide/ takes puzzles. The player's piece lies in the row of the way out; no other lying piece is put
// in that row (it could never leave it, so the way would stay shut); pieces never overlap. Pure; randomness only
// from the seed.
import { nextInt, nextRandom } from '../../../shared/core/rng.ts';
import { SLIDE } from '../config.ts';
import { cellsOf, type Piece, type Puzzle } from './unblock.ts';

/** Tries to put a piece before a board is taken as it is. */
const TRIES_PER_PIECE = 40;

/** A board with up to `count` pieces besides the player's: some may not fit. */
export function randomBoard(state: number, count: number, longShare: number): { puzzle: Puzzle; places: number[]; state: number } {
  const { size, exitRow, heroLength, lengths } = SLIDE.unblock;
  const taken = new Uint8Array(size * size);
  const own: Piece = { across: true, line: exitRow, length: heroLength };
  let draw = nextInt(state, size - heroLength); // not at the way out yet
  state = draw.state;
  const pieces: Piece[] = [own];
  const places = [draw.value];
  for (const cell of cellsOf(own, draw.value, size)) taken[cell] = 1;
  for (let tries = 0; pieces.length <= count && tries < count * TRIES_PER_PIECE; tries++) {
    const a = nextRandom(state);
    const b = nextRandom(a.state);
    state = b.state;
    const across = a.value < 0.5;
    const length = b.value < longShare ? lengths[lengths.length - 1]! : lengths[0]!;
    draw = nextInt(state, size);
    state = draw.state;
    const line = draw.value;
    if (across && line === exitRow) continue;
    draw = nextInt(state, size - length + 1);
    state = draw.state;
    const piece: Piece = { across, line, length };
    const cells = cellsOf(piece, draw.value, size);
    if (cells.some((c) => taken[c])) continue;
    for (const c of cells) taken[c] = 1;
    pieces.push(piece);
    places.push(draw.value);
  }
  return { puzzle: { size, pieces }, places, state };
}
