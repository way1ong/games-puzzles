// Where the games live on the web: one address for all of them, each game in its own folder.
// The same host is the Worker's own domain in wrangler.jsonc; address.test.ts keeps the two together.

/** The address of the games (decision of 23.11: a subdomain of way1ong.eu); null — not public yet. */
export const GAMES_ORIGIN: string | null = 'https://games.way1ong.eu';

/** The public address of a game — its folder on the games' address; null while the games have none. */
export function gameAddress(game: string): string | null {
  return GAMES_ORIGIN ? `${GAMES_ORIGIN}/${game}/` : null;
}
