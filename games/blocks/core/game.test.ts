import { describe, expect, it } from 'vitest';
import { BLOCKS } from '../config.ts';
import { emptyBoard, place } from './board.ts';
import { canContinue, newGame, placePiece, turnPiece, undo, type GameState } from './game.ts';
import { key } from './shapes.ts';

const N = BLOCKS.boardSize;

/** A game whose tray holds exactly these shapes (cells), for predictable tests. */
function withTray(state: GameState, trays: [number, number][][]): GameState {
  return { ...state, tray: trays.map((cells, i) => ({ id: 100 + i, shape: 'dot' as const, cells })) };
}

/** Places a piece anywhere it fits (top-left first). */
function placeSomewhere(state: GameState, slot: number) {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const m = placePiece(state, slot, r, c);
    if (m) return m;
  }
  throw new Error('no place');
}

describe('a game', () => {
  it('starts with an empty board and a full tray', () => {
    const g = newGame('classic', 1);
    expect(g.board.every((v) => v === 0)).toBe(true);
    expect(g.tray).toHaveLength(BLOCKS.piecesPerRound);
    expect(g.tray.every((p) => p !== null)).toBe(true);
    expect(g.round).toBe(1);
    expect(g.end).toBeNull();
  });

  it('refuses a move off the board or onto taken cells, and does not change the game', () => {
    const g = withTray(newGame('classic', 1), [[[0, 0], [0, 1], [0, 2]], [[0, 0]], [[0, 0]]]);
    expect(placePiece(g, 0, 0, N - 2)).toBeNull();
    const m = placePiece(g, 1, 0, 0);
    expect(m).not.toBeNull();
    expect(placePiece(m!.state, 0, 0, 0)).toBeNull();
  });

  it('counts points for cells and cleared lines', () => {
    let g = withTray(newGame('classic', 1), [[[0, 0]], [[0, 0]], [[0, 0]]]);
    let board = emptyBoard(N);
    for (let c = 1; c < N; c++) board = place(board, N, [[0, 0]], 0, c, 1); // row 0 waits for (0, 0)
    g = { ...g, board };
    const m = placePiece(g, 0, 0, 0)!;
    expect(m.rows).toEqual([0]);
    expect(m.points).toBe(1 * BLOCKS.pointsPerCell + BLOCKS.lineBonus);
    expect(m.state.board.slice(0, N).every((v) => v === 0)).toBe(true);
  });

  it('clears a row and a column together for 2 lines', () => {
    let g = withTray(newGame('classic', 1), [[[0, 0]], [[0, 0]], [[0, 0]]]);
    let board = emptyBoard(N);
    for (let c = 1; c < N; c++) board = place(board, N, [[0, 0]], 0, c, 1);
    for (let r = 1; r < N; r++) board = place(board, N, [[0, 0]], r, 0, 1);
    g = { ...g, board };
    const m = placePiece(g, 0, 0, 0)!;
    expect(m.rows).toEqual([0]);
    expect(m.cols).toEqual([0]);
    expect(m.points).toBe(1 * BLOCKS.pointsPerCell + 4 * BLOCKS.lineBonus);
  });

  it('deals a new set after all pieces are placed', () => {
    let g = newGame('classic', 5);
    for (let i = 0; i < BLOCKS.piecesPerRound; i++) g = placeSomewhere(g, i).state;
    expect(g.round).toBe(2);
    expect(g.tray.every((p) => p !== null)).toBe(true);
  });

  it('ends when no piece fits', () => {
    let board = emptyBoard(N);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 0) board = place(board, N, [[0, 0]], r, c, 1);
    const g = withTray({ ...newGame('classic', 1), board }, [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1]]]);
    expect(canContinue(g)).toBe(false);
  });

  it('calm mode: turns pieces and takes moves back', () => {
    const g0 = withTray(newGame('calm', 3), [[[0, 0], [0, 1], [0, 2]], [[0, 0]], [[0, 0]]]);
    const turned = turnPiece(g0, 0);
    expect(key(turned.tray[0]!.cells)).toBe(key([[0, 0], [1, 0], [2, 0]]));
    const m = placePiece(turned, 0, 0, 0)!;
    expect(m.state.score).toBeGreaterThan(0);
    const back = undo(m.state);
    expect(back.score).toBe(turned.score);
    expect(back.board).toEqual(turned.board);
    expect(back.tray).toEqual(turned.tray);
    expect(back.history).toHaveLength(0);
  });

  it('classic mode: no turning and no taking back', () => {
    const g = newGame('classic', 3);
    expect(turnPiece(g, 0)).toBe(g);
    const m = placeSomewhere(g, 0);
    expect(undo(m.state)).toBe(m.state);
  });

  it('calm mode: a piece that fits only when turned does not end the game', () => {
    let board = emptyBoard(N);
    // only one vertical gap of 3 free cells: column 0, rows 0..2
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!(c === 0 && r < 3)) board = place(board, N, [[0, 0]], r, c, 1);
    const tray: [number, number][][] = [[[0, 0], [0, 1], [0, 2]]];
    const calm = withTray({ ...newGame('calm', 1), board }, tray);
    const classic = withTray({ ...newGame('classic', 1), board }, tray);
    expect(canContinue(calm)).toBe(true);
    expect(canContinue(classic)).toBe(false);
  });

  it('daily puzzle: completes after the set number of rounds', () => {
    let g = newGame('daily', 11);
    let guard = 0;
    while (!g.end && guard++ < 1000) {
      const slot = g.tray.findIndex((p) => p !== null);
      // keep the board from filling up: clear it between moves (tests the round count, not skill)
      g = placeSomewhere({ ...g, board: emptyBoard(N) }, slot).state;
    }
    expect(g.end).toBe('completed');
    expect(g.round).toBe(BLOCKS.dailyRounds);
  });

  it('is plain data: survives saving as JSON', () => {
    const g = placeSomewhere(newGame('calm', 9), 0).state;
    expect(JSON.parse(JSON.stringify(g))).toEqual(g);
  });
});
