import { describe, expect, it } from 'vitest';
import { appProblems, appUrls, storePrefix, type AppAddress } from './app-identity.ts';
import { gameManifest, type GameApp } from './pwa.ts';

const at = (game: string) => `https://games.example/${game}/manifest.webmanifest`;
const app = (game: string): GameApp => ({ game, name: `Game ${game}`, shortName: game, description: 'A made-up game.', lang: 'en' });
/** The games as the build describes them. */
const built = (...games: string[]) => games.map((game) => ({ game, manifest: gameManifest(app(game), '#ffffff') }));
/** The same games with something else in the manifest. */
const withManifest = (change: Partial<AppAddress>, ...games: string[]) =>
  games.map((game) => ({ game, manifest: { start_url: './', scope: './', ...change } }));

describe('how a browser reads a manifest', () => {
  it('reads the start address and the scope against the manifest', () => {
    expect(appUrls({ start_url: './', scope: './' }, at('blocks'))).toEqual({
      id: 'https://games.example/blocks/',
      start: 'https://games.example/blocks/',
      scope: 'https://games.example/blocks/',
    });
  });

  it('reads an id against the site, not against the manifest', () => {
    // the mistake of 23.11: "./" named both games by the root of the site
    expect(appUrls({ id: './', start_url: './', scope: './' }, at('blocks')).id).toBe('https://games.example/');
    expect(appUrls({ id: './', start_url: './', scope: './' }, at('detective')).id).toBe('https://games.example/');
    expect(appUrls({ id: '/blocks/', start_url: './', scope: './' }, at('blocks')).id).toBe('https://games.example/blocks/');
  });

  it('keeps the start address as the identity when the id is empty or leads to another site', () => {
    expect(appUrls({ id: '', start_url: './', scope: './' }, at('blocks')).id).toBe('https://games.example/blocks/');
    expect(appUrls({ id: 'https://other.example/app', start_url: './', scope: './' }, at('blocks')).id).toBe('https://games.example/blocks/');
  });

  it('leaves the part after # out of the identity', () => {
    expect(appUrls({ start_url: './#daily', scope: './' }, at('detective')).id).toBe('https://games.example/detective/');
  });
});

describe('the manifest of a game', () => {
  it('names the game by its own folder', () => {
    const manifest = gameManifest(app('blocks'), '#ffffff');
    expect(manifest).not.toHaveProperty('id');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(appUrls(manifest, at('blocks')).id).toBe('https://games.example/blocks/');
  });
});

describe('games side by side on one address', () => {
  it('finds nothing wrong with games built as they are', () => {
    expect(appProblems(built('blocks', 'detective'))).toEqual([]);
    expect(appProblems(built('blocks', 'detective', 'words', 'blocks2'))).toEqual([]);
  });

  it('refuses one identity for two games', () => {
    const problems = appProblems(withManifest({ id: './' }, 'blocks', 'detective'));
    expect(problems.some((p) => p.includes('blocks and detective have one app identity https://games.example/'))).toBe(true);
  });

  it('refuses an identity outside the game’s folder even for a single game', () => {
    const problems = appProblems(withManifest({ id: './' }, 'blocks'));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('the app identity https://games.example/ is outside the game\'s folder');
  });

  it('accepts an id that is the game’s own folder', () => {
    expect(appProblems([{ game: 'blocks', manifest: { id: '/blocks/', start_url: './', scope: './' } }, ...built('detective')])).toEqual([]);
  });

  it('refuses a scope that takes in another game', () => {
    const problems = appProblems([{ game: 'blocks', manifest: { start_url: './', scope: '/' } }, ...built('detective')]);
    expect(problems.some((p) => p.includes('the scope of one lies inside the other\'s'))).toBe(true);
  });

  it('refuses a start address outside the scope', () => {
    const problems = appProblems([{ game: 'blocks', manifest: { start_url: '/', scope: './' } }]);
    expect(problems.some((p) => p.includes('the start address https://games.example/ is outside the scope'))).toBe(true);
  });

  it('refuses a store name that begins like another game’s', () => {
    expect(storePrefix('blocks')).toBe('way1ong-blocks-');
    // "way1ong-blocks-2-<version>" begins with "way1ong-blocks-": Blocks would take it for its own old store
    const problems = appProblems(built('blocks', 'blocks-2'));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('the store name of blocks-2 (way1ong-blocks-2-…) begins like the one of blocks (way1ong-blocks-…)');
    expect(appProblems(built('blocks-2', 'blocks'))).toHaveLength(1);
  });
});
