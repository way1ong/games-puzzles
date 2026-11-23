// How each person is drawn: what never changes from case to case. Hair colour and glasses themselves are
// traits (core/people.ts); the outfit (buttons, scarf, flower) comes with a case.
import type { PersonId } from '../../core/people.ts';
import type { Backdrop, CoatColour, EyeColour, ShirtColour, SkinTone } from '../palette.ts';

export type HairStyle = 'bob' | 'long' | 'bun' | 'short' | 'curly' | 'sides';

export interface Look {
  skin: SkinTone;
  style: HairStyle;
  eyes: EyeColour;
  /** The frame, for those who wear glasses. */
  frame: 'round' | 'rect';
  hat: 'flatcap' | 'peaked' | 'postal' | null;
  top: 'coat' | 'cardigan';
  coat: CoatColour;
  shirt: ShirtColour;
  extra: 'bow' | 'strap' | null;
  mouth: 'smile' | 'neutral' | 'smirk';
  backdrop: Backdrop;
  lashes?: boolean;
  freckles?: boolean;
  older?: boolean;
  stubble?: boolean;
  beard?: boolean;
  moustache?: boolean;
  sideburns?: boolean;
  /** Thicker brows; brows a little higher. */
  heavyBrows?: boolean;
  raisedBrows?: boolean;
}

const base = { frame: 'round', hat: null, top: 'coat', shirt: 'white', extra: null, mouth: 'smile' } as const;

export const LOOKS: Record<PersonId, Look> = {
  anna: { ...base, skin: 'fair', style: 'bob', eyes: 'green', frame: 'rect', coat: 'camel', extra: 'bow', backdrop: 'sand', lashes: true, freckles: true },
  viktor: { ...base, skin: 'tan', style: 'short', eyes: 'brown', hat: 'flatcap', coat: 'blue', shirt: 'cream', extra: 'strap', mouth: 'neutral', backdrop: 'mist', stubble: true, sideburns: true, heavyBrows: true },
  marta: { ...base, skin: 'light', style: 'bun', eyes: 'gray', coat: 'sky', backdrop: 'rose', mouth: 'smirk', lashes: true, raisedBrows: true },
  bence: { ...base, skin: 'fair', style: 'curly', eyes: 'blue', top: 'cardigan', coat: 'gray', backdrop: 'sage' },
  oleg: { ...base, skin: 'medium', style: 'sides', eyes: 'brown', hat: 'peaked', coat: 'navy', shirt: 'pale', backdrop: 'lilac', beard: true, older: true, heavyBrows: true },
  lina: { ...base, skin: 'tan', style: 'long', eyes: 'dark', coat: 'green', backdrop: 'mint', lashes: true },
  ilona: { ...base, skin: 'light', style: 'bun', eyes: 'blue', frame: 'rect', coat: 'plum', shirt: 'rose', mouth: 'neutral', backdrop: 'cream', lashes: true, older: true },
  tamas: { ...base, skin: 'light', style: 'short', eyes: 'dark', coat: 'brown', shirt: 'cream', mouth: 'neutral', backdrop: 'stone', moustache: true, older: true, sideburns: true },
  sofia: { ...base, skin: 'fair', style: 'long', eyes: 'brown', coat: 'wine', backdrop: 'blush', lashes: true, raisedBrows: true },
  pavlo: { ...base, skin: 'tan', style: 'short', eyes: 'gray', hat: 'postal', coat: 'slate', shirt: 'pale', backdrop: 'sky', sideburns: true },
  emma: { ...base, skin: 'light', style: 'bob', eyes: 'blue', top: 'cardigan', coat: 'ivory', shirt: 'rose', backdrop: 'peach', lashes: true },
  gabor: { ...base, skin: 'medium', style: 'sides', eyes: 'green', hat: 'flatcap', coat: 'moss', shirt: 'cream', backdrop: 'olive', moustache: true, older: true },
  nora: { ...base, skin: 'tan', style: 'curly', eyes: 'green', frame: 'rect', coat: 'teal', backdrop: 'pearl', lashes: true, mouth: 'smirk' },
};
