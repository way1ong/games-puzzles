// The set of "Clear the way" puzzles (docs/slide/SPEC.md, "Головоломки складено заздалегідь"):
// games/slide/levels/unblock.txt, made by scripts/slide/pool.ts — one puzzle a line, the fewest moves and the board
// (row by row, "." free, "A" the player's piece). The set only grows at its end, so a puzzle keeps its place. Pure.

export interface PoolPuzzle {
  /** The fewest moves to the way out, counted over every position of the puzzle. */
  moves: number;
  text: string;
}

export function parsePool(text: string): PoolPuzzle[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [moves, board] = line.split(' ');
      if (!moves || !board || !/^\d+$/.test(moves)) throw new Error(`Not a puzzle line: ${line}`);
      return { moves: Number(moves), text: board };
    });
}

export function poolLine(puzzle: PoolPuzzle): string {
  return `${puzzle.moves} ${puzzle.text}`;
}

/** The puzzles of each number of moves, in the order of the set. */
export function byMoves(pool: readonly PoolPuzzle[]): Map<number, PoolPuzzle[]> {
  const out = new Map<number, PoolPuzzle[]>();
  for (const p of pool) {
    const list = out.get(p.moves) ?? [];
    list.push(p);
    out.set(p.moves, list);
  }
  return out;
}
