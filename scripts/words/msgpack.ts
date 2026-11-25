// A small MessagePack reader: enough for the data files of wordfreq (maps, arrays, strings, numbers, nil,
// booleans). Written here rather than taken as a dependency; only reads data.

const decoder = new TextDecoder();

export function unpack(bytes: Uint8Array): unknown {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0;
  const str = (n: number): string => {
    const s = decoder.decode(bytes.subarray(p, p + n));
    p += n;
    return s;
  };
  const arr = (n: number): unknown[] => Array.from({ length: n }, () => read());
  const map = (n: number): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < n; i++) {
      const key = String(read());
      out[key] = read();
    }
    return out;
  };
  const u16 = (): number => {
    const v = view.getUint16(p);
    p += 2;
    return v;
  };
  const u32 = (): number => {
    const v = view.getUint32(p);
    p += 4;
    return v;
  };
  function read(): unknown {
    const b = bytes[p++]!;
    if (b <= 0x7f) return b;
    if (b <= 0x8f) return map(b & 0x0f);
    if (b <= 0x9f) return arr(b & 0x0f);
    if (b <= 0xbf) return str(b & 0x1f);
    if (b >= 0xe0) return b - 0x100;
    switch (b) {
      case 0xc0:
        return null;
      case 0xc2:
        return false;
      case 0xc3:
        return true;
      case 0xcc:
        return bytes[p++]!;
      case 0xcd:
        return u16();
      case 0xce:
        return u32();
      case 0xcb: {
        const v = view.getFloat64(p);
        p += 8;
        return v;
      }
      case 0xd9:
        return str(bytes[p++]!);
      case 0xda:
        return str(u16());
      case 0xdb:
        return str(u32());
      case 0xdc:
        return arr(u16());
      case 0xdd:
        return arr(u32());
      case 0xde:
        return map(u16());
      case 0xdf:
        return map(u32());
      default:
        throw new Error(`MessagePack type 0x${b.toString(16)} is not supported`);
    }
  }
  return read();
}

/**
 * A wordfreq list ("cB" format): a header, then buckets of words; the words of bucket i are used with the
 * frequency 10^(−i/100). Returns word → frequency.
 */
export function wordfreqList(bytes: Uint8Array): Map<string, number> {
  const data = unpack(bytes);
  if (!Array.isArray(data)) throw new Error('Not a wordfreq list');
  const [header, ...buckets] = data as [{ format?: string }, ...string[][]];
  if (header?.format !== 'cB') throw new Error('Unknown wordfreq format');
  const out = new Map<string, number>();
  buckets.forEach((words, i) => {
    for (const word of words) out.set(word, 10 ** (-i / 100));
  });
  return out;
}
