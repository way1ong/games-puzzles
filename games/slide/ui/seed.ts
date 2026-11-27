// A seed for a new free game: any number (the deal is made from it; a level and the day have their own seeds).
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0;
}
