// The places of every room: each lies on a real surface of the room, nothing overlaps, every thing has
// somewhere to go — so nothing hangs in the air (docs/detective/SPEC.md, «Місця для предметів»).
import { describe, expect, it } from 'vitest';
import { DETECTIVE } from '../config.ts';
import { canHold } from './placement.ts';
import { ROOM_IDS, SPOTS, type Spot } from './rooms.ts';
import { BAKERY, BAKERY_BLOCKED, BAKERY_RACK, BAKERY_SILL, bakeryRack } from './rooms/bakery.ts';
import { PARCEL_TOPS, POST, POST_BLOCKED, POST_CASE, POST_SILL, postCase } from './rooms/post.ts';
import { STATION, STATION_BLOCKED, STATION_SILL, SUITCASE_TOP } from './rooms/station.ts';
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

describe('the bakery', () => {
  const spots = SPOTS.bakery;
  const of = (kind: Spot['kind']) => spots.filter((s) => s.kind === kind);
  const at = (where: Spot['where']) => spots.filter((s) => s.where === where);
  const { rack, basketOnTop, window: win, cakeStand, bunBasket, table, chair, counter, mat } = BAKERY;
  const inner = { left: rack.x + rack.side, right: rack.x + rack.w - rack.side };

  it('rack: the bread and bays of every shelf fit between the sides', () => {
    expect(BAKERY_RACK.length).toBe(rack.rows.length);
    for (const row of BAKERY_RACK) {
      expect(rack.start + row.reduce((sum, part) => sum + part.w, 0)).toBeLessThanOrEqual(inner.right);
    }
    // a shelf is high enough for what stands under the next one
    rack.rows.forEach((y, i) => expect(y - ((rack.rows[i - 1] ?? rack.top) + rack.board), `shelf ${i}`).toBeGreaterThanOrEqual(rack.headroom));
  });

  it('shelf places are the free bays of the rack', () => {
    const bays = bakeryRack().filter((p) => p.item.part === 'bay');
    expect(of('shelf').map((s) => s.id).sort()).toEqual(bays.map((b) => (b.item.part === 'bay' ? b.item.spot : '')).sort());
    for (const s of of('shelf')) {
      expect(rack.rows as readonly number[], s.id).toContain(s.y);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(inner.left);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(inner.right);
      expect(s.h, s.id).toBeLessThanOrEqual(rack.headroom);
    }
  });

  it('places on the rack are on its top board, clear of the basket', () => {
    expect(at('rackTop').length).toBeGreaterThan(0);
    for (const s of at('rackTop')) {
      expect(s.y, s.id).toBe(rack.roof);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(basketOnTop.x + basketOnTop.w);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(rack.x + rack.w);
    }
  });

  it('places on the glass case are on its top', () => {
    expect(at('showcase').length).toBeGreaterThan(0);
    for (const s of at('showcase')) {
      expect(s.y, s.id).toBe(counter.showcase.top);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(counter.showcase.x);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(counter.showcase.x + counter.showcase.w);
    }
  });

  it('places on the sill, the table, the counter and the seat are on their lines, clear of what stands there', () => {
    for (const s of of('sill')) {
      expect(s.y, s.id).toBe(BAKERY_SILL);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(cakeStand.x + cakeStand.half);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(bunBasket.x - bunBasket.half);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(win.x + win.w);
    }
    for (const s of at('table')) {
      expect(s.y, s.id).toBe(table.top);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(table.x - table.half);
      // the cup stands on the right of the table
      expect(box(s).x2, s.id).toBeLessThanOrEqual(table.cup - 14);
    }
    for (const s of at('counter')) {
      expect(s.y, s.id).toBe(counter.top);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(counter.x);
      const leftOfCase = box(s).x2 <= counter.showcase.x;
      const rightOfScales = box(s).x1 >= counter.scales + 30;
      expect(leftOfCase || rightOfScales, s.id).toBe(true);
    }
    for (const s of of('seat')) {
      expect(s.y, s.id).toBe(chair.seat);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(chair.x - chair.half);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(chair.x + chair.half);
    }
  });

  it('places on the floor and the mat are on the floor, clear of the furniture', () => {
    for (const s of [...of('floor'), ...of('rug')]) {
      expect(box(s).y1, s.id).toBeGreaterThanOrEqual(BAKERY.floor);
      for (const b of BAKERY_BLOCKED) expect(overlap(box(s), b), `${s.id} / ${b.name}`).toBe(false);
    }
    const onMat = { x1: mat.x, x2: mat.x + mat.w, y1: mat.y, y2: mat.y + mat.h };
    expect(of('rug').length).toBeGreaterThan(0);
    for (const s of of('rug')) {
      expect(s.where, s.id).toBe('mat');
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(onMat.x1);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(onMat.x2);
      expect(box(s).y1, s.id).toBeGreaterThanOrEqual(onMat.y1);
      expect(s.y, s.id).toBeLessThanOrEqual(onMat.y2);
    }
    for (const s of of('floor')) expect(overlap(box(s), onMat), s.id).toBe(false);
  });
});

describe('the station', () => {
  const spots = SPOTS.station;
  const of = (kind: Spot['kind']) => spots.filter((s) => s.kind === kind);
  const at = (where: Spot['where']) => spots.filter((s) => s.where === where);
  const { window: win, benchA, benchB, suitcases, ticket, runner } = STATION;

  it('places on the sill are on its line, clear of the flower pot', () => {
    expect(of('sill').length).toBeGreaterThan(0);
    for (const s of of('sill')) {
      expect(s.y, s.id).toBe(STATION_SILL);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(win.x);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(win.x + win.w);
      expect(box(s).x2 <= win.pot - 24 || box(s).x1 >= win.pot + 24, s.id).toBe(true);
    }
  });

  it('places on the benches are on their seats', () => {
    expect(of('seat').length).toBeGreaterThan(0);
    for (const s of of('seat')) {
      expect(s.where, s.id).toBe('bench');
      const bench = [benchA, benchB].find((b) => box(s).x1 >= b.x && box(s).x2 <= b.x + b.w);
      expect(bench, s.id).toBeDefined();
      expect(s.y, s.id).toBe(bench?.seat);
    }
  });

  it('places on the suitcases are on their tops, one on each', () => {
    expect(at('suitcase').length).toBe(suitcases.xs.length);
    at('suitcase').forEach((s, i) => {
      const middle = suitcases.xs[i] as number;
      expect(s.y, s.id).toBe(SUITCASE_TOP);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(middle - suitcases.w / 2);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(middle + suitcases.w / 2);
    });
  });

  it('places at the ticket window are on its ledge, clear of the bell', () => {
    expect(at('ticketDesk').length).toBeGreaterThan(0);
    for (const s of at('ticketDesk')) {
      expect(s.y, s.id).toBe(ticket.ledge);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(ticket.x + 20);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(ticket.x + ticket.w - 20);
      expect(box(s).x2 <= ticket.bell - 24 || box(s).x1 >= ticket.bell + 24, s.id).toBe(true);
    }
  });

  it('places on the floor and the runner are on the floor, clear of the furniture', () => {
    for (const s of [...of('floor'), ...of('rug')]) {
      expect(box(s).y1, s.id).toBeGreaterThanOrEqual(STATION.floor);
      for (const b of STATION_BLOCKED) expect(overlap(box(s), b), `${s.id} / ${b.name}`).toBe(false);
    }
    const onRunner = { x1: runner.x, x2: runner.x + runner.w, y1: runner.y, y2: runner.y + runner.h };
    expect(of('rug').length).toBeGreaterThan(0);
    for (const s of of('rug')) {
      expect(s.where, s.id).toBe('runner');
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(onRunner.x1);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(onRunner.x2);
      expect(box(s).y1, s.id).toBeGreaterThanOrEqual(onRunner.y1);
      expect(s.y, s.id).toBeLessThanOrEqual(onRunner.y2);
    }
    for (const s of of('floor')) expect(overlap(box(s), onRunner), s.id).toBe(false);
  });
});

describe('the post office', () => {
  const spots = SPOTS.post;
  const of = (kind: Spot['kind']) => spots.filter((s) => s.kind === kind);
  const at = (where: Spot['where']) => spots.filter((s) => s.where === where);
  const { sorting, window: win, desk, bench, counter, parcels, mat } = POST;

  it('sorting case: the pigeonholes of every row fit between the sides, each row as high as its headroom', () => {
    expect(POST_CASE.length).toBe(sorting.rows.length);
    for (const row of POST_CASE) expect(sorting.side + row.length * sorting.cell + (row.length - 1) * sorting.divider).toBeLessThanOrEqual(sorting.w - sorting.side);
    sorting.rows.forEach((y, i) => expect(y - ((sorting.rows[i - 1] ?? sorting.top) + sorting.board), `row ${i}`).toBe(sorting.headroom));
    // the case's bottom board lies on the sorting table
    expect((sorting.rows.at(-1) as number) + sorting.board).toBe(sorting.table);
  });

  it('places in the pigeonholes are the free ones, on their lines, with room for a letter', () => {
    const bays = postCase().filter((cell) => cell.item.part === 'bay');
    const spotOf = (cell: (typeof bays)[number]) => (cell.item.part === 'bay' ? cell.item.spot : '');
    expect(at('pigeonholes').map((s) => s.id).sort()).toEqual(bays.map(spotOf).sort());
    for (const s of at('pigeonholes')) {
      const cell = bays.find((b) => spotOf(b) === s.id);
      expect(s.kind, s.id).toBe('shelf');
      expect(s.y, s.id).toBe(cell?.y);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(cell?.x ?? Infinity);
      expect(box(s).x2, s.id).toBeLessThanOrEqual((cell?.x ?? -Infinity) + sorting.cell);
      expect(s.h, s.id).toBeLessThanOrEqual(sorting.headroom);
      expect(s.w, s.id).toBeGreaterThanOrEqual(48);
      expect(s.h, s.id).toBeGreaterThanOrEqual(52);
    }
  });

  it('places on the counter are on its top, inside a service window, clear of the scales and the stamp box', () => {
    expect(at('postCounter').length).toBeGreaterThan(0);
    const windows = counter.posts.slice(0, -1).map((post, i) => ({ left: post + counter.post, right: counter.posts[i + 1] as number }));
    for (const s of at('postCounter')) {
      expect(s.y, s.id).toBe(counter.top);
      expect(windows.some((w) => box(s).x1 >= w.left && box(s).x2 <= w.right), s.id).toBe(true);
      for (const thing of [counter.scales, counter.stampBox]) expect(box(s).x2 <= thing.x - thing.half || box(s).x1 >= thing.x + thing.half, s.id).toBe(true);
    }
  });

  it('places on the sill, the writing desk and the bench are on their lines, clear of what stands there', () => {
    expect(of('sill').length).toBeGreaterThan(0);
    for (const s of of('sill')) {
      expect(s.y, s.id).toBe(POST_SILL);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(win.x);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(win.x + win.w);
    }
    expect(at('desk').length).toBeGreaterThan(0);
    for (const s of at('desk')) {
      expect(s.y, s.id).toBe(desk.top);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(desk.x);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(desk.x + desk.w);
      expect(box(s).x2 <= desk.inkwell.x - desk.inkwell.half || box(s).x1 >= desk.inkwell.x + desk.inkwell.half, s.id).toBe(true);
    }
    expect(of('seat').length).toBeGreaterThan(0);
    for (const s of of('seat')) {
      expect(s.where, s.id).toBe('bench');
      expect(s.y, s.id).toBe(bench.seat);
      // between the arms
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(bench.x + bench.arm);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(bench.x + bench.w - bench.arm);
    }
  });

  it('parcels: every box narrower than the one under it; places on the parcels are on top of a stack', () => {
    for (const stack of parcels) for (let i = 1; i < stack.boxes.length; i++) expect(stack.boxes[i]?.[0]).toBeLessThan(stack.boxes[i - 1]?.[0] ?? 0);
    expect(at('parcels').length).toBe(parcels.length);
    at('parcels').forEach((s, i) => {
      const stack = parcels[i];
      const top = stack?.boxes.at(-1)?.[0] ?? 0;
      expect(s.kind, s.id).toBe('top');
      expect(s.y, s.id).toBe(PARCEL_TOPS[i]);
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual((stack?.x ?? 0) - top / 2);
      expect(box(s).x2, s.id).toBeLessThanOrEqual((stack?.x ?? 0) + top / 2);
    });
  });

  it('places on the floor and the mat are on the floor, clear of the furniture', () => {
    for (const s of [...of('floor'), ...of('rug')]) {
      expect(box(s).y1, s.id).toBeGreaterThanOrEqual(POST.floor);
      for (const b of POST_BLOCKED) expect(overlap(box(s), b), `${s.id} / ${b.name}`).toBe(false);
    }
    const onMat = { x1: mat.x, x2: mat.x + mat.w, y1: mat.y, y2: mat.y + mat.h };
    expect(of('rug').length).toBeGreaterThan(0);
    for (const s of of('rug')) {
      expect(s.where, s.id).toBe('mat');
      expect(box(s).x1, s.id).toBeGreaterThanOrEqual(onMat.x1);
      expect(box(s).x2, s.id).toBeLessThanOrEqual(onMat.x2);
      expect(box(s).y1, s.id).toBeGreaterThanOrEqual(onMat.y1);
      expect(s.y, s.id).toBeLessThanOrEqual(onMat.y2);
    }
    for (const s of of('floor')) expect(overlap(box(s), onMat), s.id).toBe(false);
  });
});
