// The page and the worker speak one word for "take over", and only that word makes a new version take over.
import { describe, expect, it } from 'vitest';
import worker from '../../scripts/sw-template.js?raw';
import { TAKE_OVER } from './update.ts';

describe('a new version waits for the player', () => {
  it('the worker listens for the word the page sends', () => {
    expect(worker).toContain(`event.data === '${TAKE_OVER}'`);
  });

  it('the worker takes over only when told, never by itself on install', () => {
    const calls = worker.match(/skipWaiting\(\)/g) ?? [];
    expect(calls).toHaveLength(1);
    const message = worker.slice(worker.indexOf("addEventListener('message'"));
    expect(message.indexOf('skipWaiting()')).toBeGreaterThan(0);
    expect(message.indexOf('skipWaiting()')).toBeLessThan(message.indexOf('});'));
  });
});
