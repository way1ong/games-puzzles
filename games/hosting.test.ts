import { describe, expect, it } from 'vitest';
import headers from './public/_headers?raw';

/** The header rules of games/public/_headers: address pattern → header name (lower case) → value. */
function rules(text: string): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  let current: Map<string, string> | null = null;
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = new Map();
      out.set(line.trim(), current);
    } else if (current) {
      const at = line.indexOf(':');
      current.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
    }
  }
  return out;
}

describe('how the games are served', () => {
  it('forbids anyone on the way to change the files', () => {
    // Without "no-transform" Cloudflare adds a measuring script to the pages of a domain: against the rule
    // "no tracking, no outside requests". The real address is checked by `npm run check:live`.
    const cacheControl = rules(headers).get('/*')?.get('cache-control') ?? '';
    expect(cacheControl.split(',').map((part) => part.trim())).toContain('no-transform');
  });
});
