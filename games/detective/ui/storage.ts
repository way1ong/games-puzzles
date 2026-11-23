// What stays on the device (localStorage): settings, the state of every case, daily results. Nothing leaves
// the device. Every read survives a missing or broken value.
import type { CaseDef } from '../core/cases.ts';
import { restore, type Progress } from '../core/game.ts';

const PREFIX = 'way1ong-detective:v1:';

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

export interface Settings {
  lang: string | null;
  big: boolean;
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  return { lang: typeof s.lang === 'string' ? s.lang : null, big: s.big === true };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

/** The saved state of a case (a daily case — only of that day: its name carries the date). */
export function loadProgress(def: CaseDef): Progress | null {
  return restore(def, read<unknown>(`case:${def.id}`));
}

export function saveProgress(progress: Progress): void {
  write(`case:${progress.caseId}`, progress);
}

export function clearProgress(caseId: string): void {
  try {
    window.localStorage.removeItem(`${PREFIX}case:${caseId}`);
  } catch {
    // Nothing to clear.
  }
}

/** The seed of the free search in progress, read before its case can be made. */
export function loadSearchSeed(caseId: string): number | null {
  const saved = read<{ seed?: unknown }>(`case:${caseId}`);
  return typeof saved?.seed === 'number' ? saved.seed : null;
}

export interface DayResult {
  tries: number;
  hints: number;
}

/** Daily cases solved: date "YYYY-MM-DD" → how it went. */
export function loadDays(): Record<string, DayResult> {
  const v = read<Record<string, DayResult>>('days');
  return v && typeof v === 'object' ? v : {};
}

export function saveDay(date: string, result: DayResult): void {
  const days = loadDays();
  if (!days[date]) write('days', { ...days, [date]: result });
}

/** Daily cases of other days are of no use any more. */
export function dropOldDaily(today: string): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(`${PREFIX}case:daily:`) && k !== `${PREFIX}case:daily:${today}`) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // Nothing to drop.
  }
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
