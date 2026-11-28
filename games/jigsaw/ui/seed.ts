// A seed for a new free puzzle: any number (the cut, the tray and the things are made from it; the day has its own).
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0;
}
