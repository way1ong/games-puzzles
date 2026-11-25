import { describe, expect, it } from 'vitest';
import { decodeEntry, readCfsa2 } from './cfsa2.ts';
import { unpack, wordfreqList } from './msgpack.ts';

const enc = new TextEncoder();
const header = (labels: number[]) => [0x5c, 0x66, 0x73, 0x61, 0xc6, 0x00, 0x07, labels.length, ...labels];
const accepted = (bytes: number[]): string[] => {
  const out: string[] = [];
  readCfsa2(new Uint8Array(bytes)).walk((seq) => out.push(new TextDecoder().decode(seq)));
  return out;
};

describe('reading a morfologik automaton', () => {
  it('lists every sequence: explicit labels, arcs with and without a goto', () => {
    // epsilon → root; root: 'a' (target next) → node: 'b' (final), 'c' (final, last)
    const arcs = [0x40, 0x00, 0x03, 0xc0, 0x61, 0x20, 0x62, 0x00, 0x60, 0x63, 0x00];
    expect(accepted([...header([]), ...arcs])).toEqual(['ab', 'ac']);
  });

  it('reads labels from the table, and final arcs that lead on', () => {
    // labels: index 1 = 'a'; root: 'a' (indexed, final, last, target next) → node: 'b' (final, last)
    const arcs = [0x40, 0x00, 0x03, 0xe1, 0x60, 0x62, 0x00];
    expect(accepted([...header([0x00, 0x61]), ...arcs])).toEqual(['a', 'ab']);
  });

  it('refuses another format', () => {
    expect(() => readCfsa2(new Uint8Array([0x5c, 0x66, 0x73, 0x61, 0xc5]))).toThrow();
  });

  it('decodes an entry: the lemma from the form, the tags', () => {
    // "котом" → lemma "кіт": keep "к" (2 bytes), cut 8 bytes, add "іт"
    const entry = enc.encode('котом+Iіт+noun:anim:m:v_oru');
    expect(decodeEntry(entry)).toEqual({ form: 'котом', lemma: 'кіт', tags: 'noun:anim:m:v_oru' });
    expect(decodeEntry(enc.encode('кіт+A+noun:anim:m:v_naz'))?.lemma).toBe('кіт');
    expect(decodeEntry(enc.encode('без розділювачів'))).toBeNull();
  });
});

describe('reading MessagePack and wordfreq lists', () => {
  const s = (text: string) => [0xa0 | enc.encode(text).length, ...enc.encode(text)];
  const list = [0x94, 0x82, ...s('format'), ...s('cB'), ...s('version'), 0x01, 0x92, ...s('the'), ...s('a'), 0x90, 0x91, ...s('of')];

  it('reads maps, arrays, strings and numbers', () => {
    expect(unpack(new Uint8Array(list))).toEqual([{ format: 'cB', version: 1 }, ['the', 'a'], [], ['of']]);
    expect(unpack(new Uint8Array([0xcd, 0x01, 0x00]))).toBe(256);
    expect(unpack(new Uint8Array([0xc0]))).toBeNull();
  });

  it('gives every word the frequency of its bucket', () => {
    const freq = wordfreqList(new Uint8Array(list));
    expect(freq.get('the')).toBe(1);
    expect(freq.get('of')).toBeCloseTo(10 ** -0.02);
    expect(freq.has('cat')).toBe(false);
  });
});
