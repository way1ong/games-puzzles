// What stays on the device (localStorage): settings, best scores, daily results, unfinished games.
// Nothing leaves the device. Every read survives a missing or broken value.
import { BLOCKS } from '../config.ts';
import { MODES, type GameState, type Mode } from '../core/game.ts';

const PREFIX = 'way1ong-blocks:v1:';

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game goes on without saving.
  }
}

/** The game's look (decisions of 25.11): simple, as at first (the default), or drawn (a wooden board, wooden blocks). */
export type Look = 'drawn' | 'simple';

export interface Settings {
  lang: string | null;
  big: boolean;
  vibration: boolean;
  look: Look;
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    big: s.big === true,
    vibration: s.vibration === true,
    look: s.look === 'drawn' ? 'drawn' : 'simple',
  };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

export function loadBest(mode: Mode): number {
  const v = read<number>(`best:${mode}`);
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function saveBest(mode: Mode, score: number): void {
  write(`best:${mode}`, score);
}

/** Daily results: date "YYYY-MM-DD" → score. */
export function loadDaily(): Record<string, number> {
  const v = read<Record<string, number>>('daily');
  return v && typeof v === 'object' ? v : {};
}

export function saveDailyResult(date: string, score: number): void {
  write('daily', { ...loadDaily(), [date]: score });
}

/** The mode played last time: the game opens in it again. */
export function loadMode(): Mode | null {
  const v = read<string>('mode');
  return MODES.find((m) => m === v) ?? null;
}

export function saveMode(mode: Mode): void {
  write('mode', mode);
}

/** Whether a piece has ever been placed on this device: until then the board shows how to play. */
export function loadHintDone(): boolean {
  return read<boolean>('hintDone') === true;
}

export function saveHintDone(): void {
  write('hintDone', true);
}

interface SavedGame {
  state: GameState;
  /** The day of a daily game. */
  date: string | null;
}

export function loadGame(mode: Mode, today: string): GameState | null {
  const saved = read<SavedGame>(`game:${mode}`);
  if (!saved || saved.state?.version !== 1 || saved.state.mode !== mode) return null;
  // A game saved under other rules (board or round size changed since) is not continued.
  if (saved.state.size !== BLOCKS.boardSize || saved.state.tray?.length !== BLOCKS.piecesPerRound) return null;
  if (mode === 'daily' && saved.date !== today) return null;
  return saved.state;
}

export function saveGame(mode: Mode, state: GameState, today: string): void {
  write(`game:${mode}`, { state, date: mode === 'daily' ? today : null } satisfies SavedGame);
}

export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX) && k !== `${PREFIX}settings`) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // Nothing to clear.
  }
}
