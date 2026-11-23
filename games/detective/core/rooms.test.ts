// The places of every room: each lies on a real surface of the room, nothing overlaps, every thing has
// somewhere to go — so nothing hangs in the air (docs/detective/SPEC.md, «Місця для предметів»).
import { describe, expect, it } from 'vitest';
import { DETECTIVE } from '../config.ts';
import { canHold } from './placement.ts';
import { ROOM_IDS, SPOTS, type Spot } from './rooms.ts';
import { BOOK_GAP, STUDY, STUDY_BLOCKED, STUDY_SHELVES, STUDY_SILL, studyShelves } from './rooms/study.ts';
import { ORDINARY, type ThingId } from './things.ts';
import { ALL_CLUES } from './traits.ts';

const box = (s: Spot) => ({ x1: s.x - s.w / 2, x2: s.x + s.w / 2, y1: s.y - s.h, y2: s.y });
const overlap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

describe.each(ROOM_IDS)('places of the room %s', (room) => {
  const spots = SPOTS[room];

  it('have their own names and lie inside the room', () => {
    expect(new Set(spots.map((s) => s.id)).size).toBe(spots.length);
    for (const s of spots) {
      const b = box(s);
      expect(s.w, s.id).toBeGreaterThan(0);
      expect(s.h, s.id).toBeGreaterThan(0);
      expect(b.x1, s.id).toBeGreaterThanOrEqual(0);
      expect(b.x2, s.id).toBeLessThanOrEqual(DETECTIVE.scene.width);
      expect(b.y1, s.id).toBeGreaterThanOrEqual(0);
      expect(b.y2, s.id).toBeLessThanOrEqual(DETECTIVE.scene.height);
    }
  });

  it('do not overlap', () => {
    for (const a of spots) for (const b of spots) if (a.id < b.id) expect(overlap(box(a), box(b)), `${a.id} / ${b.id}`).toBe(false);
  });

  it('give every thing at least three places, and a full list of things fits', () => {
    const things: ThingId[] = [...ORDINARY, ...ALL_CLUES];
    for (const thing of things) expect(spots.filter((s) => canHold(s, thing)).length, thing).toBeGreaterThanOrEqual(3);
    expect(spots.length).toBeGreaterThanOrEqual(2 * DETECTIVE.thingsPerScene);
  });
});

describe('the study', () => {
  const spots = SPOTS.study;
  const of = (kind: Spot['kind']) => spots.filter((s) => s.kind === kind);
  const { bookcase, desk, chair, window: win, rug, booksOnTop } = STUDY;
  const inner = { left: bookcase.x + bookcase.side, right: bookcase.x + bookcase.w - bookcase.side };

  it('shelves: the books and bays of every row fit between the sides', () => {
    expect(STUDY_SHELVES.length).toBe(bookcase.rows.length);
    for (const row of STUDY_SHELVES) {
      const width = row.reduce((sum, part) => sum + part.w + (part.part === 'book' ? BOOK_GAP : 0), 0);
      expect(bookcase.start + width).toBeLessThanOrEqual(inner.right);
      for (const part of row) if (part.part === 'book') expect(part.h).toBeLessThanOrEqual(bookcase.headroom);
    }
  });

  it('a leaning book reaches its neighbour', () => {
    for (const row of STUDY_SHELVES) {
      row.forEach((part, i) => {
        if (part.part !== 'book' || !part.lean) return;
        const before = row[i - 1];
        const lean = Math.sin((Math.abs(part.lean) * Math.PI) / 180) * part.h;
        expect(before?.part).toBe('gap');
        expect(before?.w ?? 0).toBeLessThanOrEqual(lean);
      });
    }
  });

  it('shelf places are the free bays of the shelves', () => {
    const bays = studyShelves().filter((p) => p.item.part === 'bay');
    expect(of('shelf').map((s) => s.id).sort()).toEqual(bays.map((b) => (b.item.part === 'bay' ? b.item.spot : '')).sort());
    for (const s of of('shelf')) {
      expect(bookcase.rows as readonly number[], s.id).toContain(s.y);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(inner.left);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(inner.right);
      expect(s.h, s.id).toBeLessThanOrEqual(bookcase.headroom);
    }
  });

  it('places on the bookcase are on its top board or on the books lying there', () => {
    for (const s of of('top')) {
      const onBooks = s.y === booksOnTop.top;
      expect(onBooks || s.y === bookcase.roof, s.id).toBe(true);
      if (onBooks) {
        expect(box(s).x1, s.id).toBeGreaterThanOrEqual(booksOnTop.x);
        expect(box(s).x2, s.id).toBeLessThanOrEqual(booksOnTop.x + booksOnTop.w);
      } else {
        expect(box(s).x1, s.id).toBeGreaterThanOrEqual(bookcase.x);
        expect(box(s).x2, s.id).toBeLessThanOrEqual(bookcase.x + bookcase.w);
        // not where the books lie
        expect(box(s).x2 <= booksOnTop.x || box(s).x1 >= booksOnTop.x + booksOnTop.w, s.id).toBe(true);
      }
    }
  });

  it('places on the sill, the desk and the seat are on their lines', () => {
    for (const s of of('sill')) {
      expect(s.y, s.id).toBe(STUDY_SILL);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(win.x);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(win.plant - 19);
    }
    for (const s of of('desk')) {
      const onPapers = s.y === desk.papers.top;
      expect(onPapers || s.y === desk.top, s.id).toBe(true);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(onPapers ? desk.papers.x : desk.x);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(onPapers ? desk.papers.x + desk.papers.w : desk.x + desk.w);
    }
    for (const s of of('seat')) {
      expect(s.y, s.id).toBe(chair.seat);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(chair.x - chair.half);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(chair.x + chair.half);
    }
  });

  it('places on the floor and the rug are on the floor, clear of the furniture', () => {
    for (const s of [...of('floor'), ...of('rug')]) {
      expect(box(s).y1, s.id).toBeGreaterThanOrEqual(STUDY.floor);
      for (const b of STUDY_BLOCKED) expect(overlap(box(s), b), `${s.id} / ${b.name}`).toBe(false);
    }
    const onRug = (x: number, y: number) => ((x - rug.cx) / rug.rx) ** 2 + ((y - rug.cy) / rug.ry) ** 2;
    for (const s of of('rug')) expect(onRug(s.x, s.y), s.id).toBeLessThan(0.75);
    for (const s of of('floor')) expect(onRug(s.x, s.y - s.h / 2), s.id).toBeGreaterThan(1);
  });
});
