// A moment of the day in words of the language: "21:40", "9:40 PM".
import type { Minutes } from '../core/facts.ts';

export function timeText(lang: string, at: Minutes): string {
  const moment = new Date(Date.UTC(2000, 0, 1, Math.floor(at / 60), at % 60));
  return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(moment);
}
