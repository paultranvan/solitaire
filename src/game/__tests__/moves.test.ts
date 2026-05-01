import { describe, expect, it } from 'vitest';
import { color, makeCard } from '../card';
import { applyMove, InvalidMoveError, undo } from '../moves';
import { canPlaceOnFoundation, canPlaceOnTableau } from '../rules';
import { GameState } from '../state';

const blank = (over: Partial<GameState> = {}): GameState => ({
  schemaVersion: 1,
  tableau: [[], [], [], [], [], [], []],
  foundations: [[], [], [], []],
  stock: [],
  talon: [],
  drawCount: 1,
  startedAt: 0,
  movesMade: 0,
  redealCount: 0,
  seed: 't',
  history: [],
  ...over,
});

describe('applyMove: draw (drawCount=1)', () => {
  it('moves the top stock card face-up onto the talon', () => {
    const s = blank({
      stock: [makeCard('h', 1), makeCard('s', 5)],
    });
    const next = applyMove(s, { kind: 'draw' });
    expect(next.stock).toHaveLength(1);
    expect(next.talon).toHaveLength(1);
    expect(next.talon[0]).toEqual({ id: 's5', suit: 's', rank: 5, faceUp: true });
    expect(next.movesMade).toBe(1);
    expect(next.history).toHaveLength(1);
  });

  it('throws when stock is empty', () => {
    expect(() => applyMove(blank(), { kind: 'draw' })).toThrow(InvalidMoveError);
  });
});

describe('applyMove: draw (drawCount=3)', () => {
  it('moves up to 3 cards from stock to talon, preserving order', () => {
    const s = blank({
      drawCount: 3,
      stock: [makeCard('h', 1), makeCard('s', 5), makeCard('c', 9), makeCard('d', 4)],
    });
    const next = applyMove(s, { kind: 'draw' });
    expect(next.stock).toHaveLength(1);
    // Stock top (d4) is drawn first and lands on the bottom of the flipped talon spread;
    // visible top of talon (last in array) is s5.
    expect(next.talon.map((c) => c.id)).toEqual(['d4', 'c9', 's5']);
    expect(next.talon.every((c) => c.faceUp)).toBe(true);
  });

  it('moves whatever remains when stock has fewer than 3', () => {
    const s = blank({ drawCount: 3, stock: [makeCard('h', 1), makeCard('s', 5)] });
    const next = applyMove(s, { kind: 'draw' });
    expect(next.stock).toHaveLength(0);
    expect(next.talon.map((c) => c.id)).toEqual(['s5', 'h1']);
  });
});

describe('applyMove: recycle', () => {
  it('moves all talon cards back to stock face-down, in reversed order, increments redealCount', () => {
    const s = blank({
      stock: [],
      talon: [makeCard('h', 1, true), makeCard('s', 5, true), makeCard('c', 9, true)],
    });
    const next = applyMove(s, { kind: 'recycle' });
    expect(next.talon).toHaveLength(0);
    expect(next.stock.map((c) => c.id)).toEqual(['c9', 's5', 'h1']);
    expect(next.stock.every((c) => c.faceUp === false)).toBe(true);
    expect(next.redealCount).toBe(1);
  });

  it('throws when stock is non-empty', () => {
    const s = blank({ stock: [makeCard('h', 1)] });
    expect(() => applyMove(s, { kind: 'recycle' })).toThrow(InvalidMoveError);
  });
});

describe('applyMove: tableauToTableau (single card)', () => {
  it('moves a face-up tableau top to a legal target column', () => {
    const s = blank({
      tableau: [[makeCard('s', 7, true)], [makeCard('h', 6, true)], [], [], [], [], []],
    });
    const next = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s7', 'h6']);
    expect(next.tableau[1]).toEqual([]);
  });

  it('rejects an illegal target', () => {
    const s = blank({
      tableau: [[makeCard('s', 7, true)], [makeCard('h', 7, true)], [], [], [], [], []],
    });
    expect(() =>
      applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 }),
    ).toThrow(InvalidMoveError);
  });

  it('auto-flips the new top of the source column if it is face-down', () => {
    const s = blank({
      tableau: [
        [makeCard('h', 5, true)],
        [makeCard('s', 9, false), makeCard('c', 4, true)],
        [], [], [], [], [],
      ],
    });
    const next = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 1, to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['h5', 'c4']);
    expect(next.tableau[1]).toHaveLength(1);
    expect(next.tableau[1][0].faceUp).toBe(true);
  });
});

describe('applyMove: tableauToTableau (stack)', () => {
  it('moves a contiguous valid stack starting from cardIndex', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 8, true)],
        [makeCard('h', 7, true), makeCard('c', 6, true), makeCard('d', 5, true)],
        [], [], [], [], [],
      ],
    });
    const next = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s8', 'h7', 'c6', 'd5']);
    expect(next.tableau[1]).toEqual([]);
  });

  it('rejects an invalid stack pickup (broken sequence)', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 8, true)],
        // h7 (red) + d6 (red) — same color, not a valid descending alternating stack
        [makeCard('h', 7, true), makeCard('d', 6, true)],
        [], [], [], [], [],
      ],
    });
    expect(() =>
      applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 }),
    ).toThrow(InvalidMoveError);
  });

  it('rejects moving a face-down card', () => {
    const s = blank({
      tableau: [[makeCard('s', 8, true)], [makeCard('h', 7, false)], [], [], [], [], []],
    });
    expect(() =>
      applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 }),
    ).toThrow(InvalidMoveError);
  });

  it('rejects from === to', () => {
    const s = blank({ tableau: [[makeCard('s', 8, true)], [], [], [], [], [], []] });
    expect(() =>
      applyMove(s, { kind: 'tableauToTableau', from: 0, cardIndex: 0, to: 0 }),
    ).toThrow(InvalidMoveError);
  });
});

describe('applyMove: tableauToFoundation', () => {
  it('moves the tableau top card to a legal foundation slot', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    const next = applyMove(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 });
    expect(next.tableau[0]).toEqual([]);
    expect(next.foundations[0].map((c) => c.id)).toEqual(['h1']);
  });

  it('auto-flips the source column top after move', () => {
    const s = blank({
      tableau: [[makeCard('s', 9, false), makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    const next = applyMove(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 });
    expect(next.tableau[0]).toHaveLength(1);
    expect(next.tableau[0][0].faceUp).toBe(true);
  });

  it('rejects illegal foundation target', () => {
    const s = blank({
      tableau: [[makeCard('h', 5, true)], [], [], [], [], [], []],
    });
    expect(() =>
      applyMove(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 }),
    ).toThrow(InvalidMoveError);
  });
});

describe('applyMove: talonToTableau / talonToFoundation', () => {
  it('talonToTableau: legal move pops talon and adds to column', () => {
    const s = blank({
      tableau: [[makeCard('s', 8, true)], [], [], [], [], [], []],
      talon: [makeCard('h', 7, true)],
    });
    const next = applyMove(s, { kind: 'talonToTableau', to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s8', 'h7']);
    expect(next.talon).toEqual([]);
  });

  it('talonToTableau: rejects illegal target', () => {
    const s = blank({
      tableau: [[makeCard('s', 8, true)], [], [], [], [], [], []],
      talon: [makeCard('s', 7, true)],
    });
    expect(() => applyMove(s, { kind: 'talonToTableau', to: 0 })).toThrow(InvalidMoveError);
  });

  it('talonToFoundation: legal A onto empty foundation', () => {
    const s = blank({ talon: [makeCard('h', 1, true)] });
    const next = applyMove(s, { kind: 'talonToFoundation', foundationIdx: 0 });
    expect(next.foundations[0].map((c) => c.id)).toEqual(['h1']);
    expect(next.talon).toEqual([]);
  });

  it('talonToFoundation: rejects when talon empty', () => {
    expect(() => applyMove(blank(), { kind: 'talonToFoundation', foundationIdx: 0 })).toThrow(
      InvalidMoveError,
    );
  });
});

describe('applyMove: foundationToTableau', () => {
  it('moves foundation top back onto a legal tableau target', () => {
    const s = blank({
      foundations: [[makeCard('h', 1, true), makeCard('h', 2, true)], [], [], []],
      tableau: [[makeCard('s', 3, true)], [], [], [], [], [], []],
    });
    const next = applyMove(s, { kind: 'foundationToTableau', foundationIdx: 0, to: 0 });
    expect(next.foundations[0].map((c) => c.id)).toEqual(['h1']);
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s3', 'h2']);
  });

  it('rejects when foundation empty', () => {
    expect(() => applyMove(blank(), { kind: 'foundationToTableau', foundationIdx: 0, to: 0 })).toThrow(
      InvalidMoveError,
    );
  });
});

describe('undo', () => {
  it('reverses a single move exactly', () => {
    const s = blank({
      tableau: [[makeCard('s', 7, true)], [makeCard('h', 6, true)], [], [], [], [], []],
    });
    const after = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 });
    const back = undo(after);
    expect(back.tableau).toEqual(s.tableau);
    expect(back.talon).toEqual(s.talon);
    expect(back.stock).toEqual(s.stock);
    expect(back.foundations).toEqual(s.foundations);
    expect(back.movesMade).toBe(s.movesMade);
    expect(back.history).toEqual(s.history);
  });

  it('reverses multiple moves in order', () => {
    let s: GameState = blank({ stock: [makeCard('h', 1), makeCard('s', 5)] });
    s = applyMove(s, { kind: 'draw' });
    const drawn = s;
    s = applyMove(s, { kind: 'draw' });
    const u1 = undo(s);
    expect(u1.stock).toEqual(drawn.stock);
    expect(u1.talon).toEqual(drawn.talon);
    const u2 = undo(u1);
    expect(u2.stock.map((c) => c.id)).toEqual(['h1', 's5']);
    expect(u2.talon).toEqual([]);
  });

  it('is a no-op when history is empty', () => {
    const s = blank();
    const u = undo(s);
    expect(u).toEqual(s);
  });
});

describe('rules helpers reused', () => {
  it('imports work', () => {
    expect(color('h')).toBe('red');
    expect(canPlaceOnFoundation(makeCard('h', 1, true), undefined)).toBe(true);
    expect(canPlaceOnTableau(makeCard('s', 13, true), undefined)).toBe(true);
  });
});
