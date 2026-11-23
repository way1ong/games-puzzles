import { describe, expect, it } from 'vitest';
import { BLOCKS } from '../../games/blocks/config.ts';
import { DETECTIVE } from '../../games/detective/config.ts';
import wrangler from '../../wrangler.jsonc?raw';
import { GAMES_ORIGIN, gameAddress } from './address.ts';

/** wrangler.jsonc keeps its comments on lines of their own. */
function readJsonc(text: string): { routes?: { pattern: string; custom_domain?: boolean }[]; workers_dev?: boolean } {
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));
}

describe('the address of the games', () => {
  it('gives every game its folder on the games’ address', () => {
    expect(GAMES_ORIGIN).not.toBeNull();
    expect(gameAddress('blocks')).toBe(`${GAMES_ORIGIN}/blocks/`);
    expect(BLOCKS.links.game).toBe(gameAddress('blocks'));
    expect(DETECTIVE.links.game).toBe(gameAddress('detective'));
  });

  it('is the address Cloudflare serves the games at', () => {
    const config = readJsonc(wrangler);
    const hosts = (config.routes ?? []).filter((route) => route.custom_domain).map((route) => route.pattern);
    // A game that tells players one address while Cloudflare serves another would send them nowhere.
    expect(hosts).toEqual([new URL(GAMES_ORIGIN as string).host]);
  });
});
