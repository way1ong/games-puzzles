import { describe, expect, it } from 'vitest';
import { canPlace, clearLines, emptyBoard, fitsAnywhere, fullLines, place } from './board.ts';

const N = 8;
const I3: [number, number][] = [[0, 0], [0, 1], [0, 2]];

describe('board', () => {
  it('places on free cells inside the board only', () => {
    const b = emptyBoard(N);
    expect(canPlace(b, N, I3, 0, 0)).toBe(true);
    expect(canPlace(b, N, I3, 0, 6)).toBe(false); // over the right edge
    expect(canPlace(b, N, I3, -1, 0)).toBe(false);
    const filled = place(b, N, [[0, 0]], 0, 1, 1);
    expect(canPlace(filled, N, I3, 0, 0)).toBe(false); // occupied
  });

  it('finds full rows and columns and clears a crossing once', () => {
    let b = emptyBoard(N);
    for (let c = 0; c < N; c++) b = place(b, N, [[0, 0]], 2, c, 1);
    for (let r = 0; r < N; r++) if (r !== 2) b = place(b, N, [[0, 0]], r, 5, 1);
    const full = fullLines(b, N);
    expect(full).toEqual({ rows: [2], cols: [5] });
    const cleared = clearLines(b, N, full);
    expect(cleared.every((v) => v === 0)).toBe(true);
  });

  it('says whether a shape fits anywhere', () => {
    let b = emptyBoard(N);
    // fill everything except one free cell
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!(r === 4 && c === 4)) b = place(b, N, [[0, 0]], r, c, 1);
    expect(fitsAnywhere(b, N, [[0, 0]])).toBe(true);
    expect(fitsAnywhere(b, N, I3)).toBe(false);
  });
});
