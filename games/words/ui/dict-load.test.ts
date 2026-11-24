import { describe, expect, it } from 'vitest';
import { fromDataUrl } from './dict-load.ts';

describe('a word list carried inside the page (the one-file test page)', () => {
  const text = 'план\nszív\nknow\n';

  it('is read from base64', () => {
    const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(text)));
    expect(fromDataUrl(`data:text/plain;base64,${base64}`)).toBe(text);
  });

  it('is read from percent-encoded text', () => {
    expect(fromDataUrl(`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`)).toBe(text);
  });
});
