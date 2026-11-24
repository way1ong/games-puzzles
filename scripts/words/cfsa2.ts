// Reading a morfologik automaton (CFSA2, version byte 0xc6) — the format of the Ukrainian dictionary of
// LanguageTool. Written from the format's description in morfologik's source (CFSA2.java, TrimSuffixEncoder.java),
// so no program from the dictionary's project is run. Header: "\fsa", version, flags (big-endian 16 bits), size
// of the label table, the table, then the arcs.

const BIT_TARGET_NEXT = 1 << 7;
const BIT_LAST_ARC = 1 << 6;
const BIT_FINAL_ARC = 1 << 5;
const LABEL_INDEX_MASK = (1 << 5) - 1;
/** Automata that number their states (flag NUMBERS) put a number before each state: not supported here. */
const FLAG_NUMBERS = 1 << 8;

export interface Automaton {
  /** Calls `emit` with every byte sequence the automaton accepts (a view of a shared buffer: copy to keep). */
  walk(emit: (sequence: Uint8Array) => void): void;
}

export function readCfsa2(bytes: Uint8Array): Automaton {
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  if (magic !== '\\fsa' || bytes[4] !== 0xc6) throw new Error('Not a CFSA2 automaton');
  const flags = (bytes[5]! << 8) | bytes[6]!;
  if (flags & FLAG_NUMBERS) throw new Error('Numbered automata are not supported');
  const labelCount = bytes[7]!;
  const labels = bytes.subarray(8, 8 + labelCount);
  const arcs = bytes.subarray(8 + labelCount);

  const readVInt = (offset: number): number => {
    let b = arcs[offset]!;
    let value = b & 0x7f;
    for (let shift = 7; b & 0x80; shift += 7) {
      b = arcs[++offset]!;
      value |= (b & 0x7f) << shift;
    }
    return value;
  };
  const skipVInt = (offset: number): number => {
    while (arcs[offset++]! & 0x80);
    return offset;
  };
  const isLast = (arc: number): boolean => (arcs[arc]! & BIT_LAST_ARC) !== 0;
  const skipArc = (offset: number): number => {
    const flag = arcs[offset++]!;
    if ((flag & LABEL_INDEX_MASK) === 0) offset++;
    if ((flag & BIT_TARGET_NEXT) === 0) offset = skipVInt(offset);
    return offset;
  };
  const nextArc = (arc: number): number => (isLast(arc) ? 0 : skipArc(arc));
  const label = (arc: number): number => {
    const index = arcs[arc]! & LABEL_INDEX_MASK;
    return index > 0 ? labels[index]! : arcs[arc + 1]!;
  };
  const target = (arc: number): number => {
    if (arcs[arc]! & BIT_TARGET_NEXT) {
      let last = arc;
      while (!isLast(last)) last = nextArc(last);
      return skipArc(last);
    }
    return readVInt(arc + ((arcs[arc]! & LABEL_INDEX_MASK) === 0 ? 2 : 1));
  };
  const isFinal = (arc: number): boolean => (arcs[arc]! & BIT_FINAL_ARC) !== 0;

  return {
    walk(emit) {
      const path = new Uint8Array(1 << 12);
      // Depth first, without recursion: a stack of (arc, depth).
      const arcStack: number[] = [target(0)];
      const depthStack: number[] = [0];
      while (arcStack.length) {
        const arc = arcStack.pop()!;
        const depth = depthStack.pop()!;
        if (arc === 0) continue;
        path[depth] = label(arc);
        // The next sibling after this arc's whole subtree: pushed first, so it comes out last.
        arcStack.push(nextArc(arc));
        depthStack.push(depth);
        if (isFinal(arc)) emit(path.subarray(0, depth + 1));
        const node = target(arc);
        if (node !== 0) {
          arcStack.push(node);
          depthStack.push(depth + 1);
        }
      }
    },
  };
}

export interface Analysis {
  form: string;
  lemma: string;
  tags: string;
}

const PLUS = 0x2b;
const decoder = new TextDecoder();

/**
 * One entry of a morfologik dictionary: "form+<lemma code>+tags", where the lemma code is one byte ('A' + how
 * many bytes to cut off the end of the form; 255 — all of it) and the bytes to add (TrimSuffixEncoder).
 */
export function decodeEntry(sequence: Uint8Array): Analysis | null {
  const a = sequence.indexOf(PLUS);
  const b = a < 0 ? -1 : sequence.indexOf(PLUS, a + 1);
  if (a < 0 || b < 0) return null;
  const form = sequence.subarray(0, a);
  let cut = (sequence[a + 1]! - 0x41) & 0xff;
  if (cut === 255) cut = form.length;
  const lemma = new Uint8Array(form.length - cut + (b - a - 2));
  lemma.set(form.subarray(0, form.length - cut));
  lemma.set(sequence.subarray(a + 2, b), form.length - cut);
  return { form: decoder.decode(form), lemma: decoder.decode(lemma), tags: decoder.decode(sequence.subarray(b + 1)) };
}
