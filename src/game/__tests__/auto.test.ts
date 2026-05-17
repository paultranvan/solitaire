import { describe, expect, it } from 'vitest';
import { Card, makeCard, RANKS, SUITS } from '../card';
import { findAutoMoveTarget, nextAutoCompleteMove } from '../auto';
import { applyMove } from '../moves';
import { isWon } from '../rules';
import { GameState } from '../state';
import { blankGameState as blank } from '@/test-utils/factories';

describe('findAutoMoveTarget — talon source', () => {
  it('targets foundation when the talon top is eligible', () => {
    const s = blank({ talon: [makeCard('h', 1, true)] });
    expect(findAutoMoveTarget(s, { kind: 'talon' })).toEqual({
      kind: 'talonToFoundation',
      foundationIdx: 0,
    });
  });

  it('targets the leftmost legal tableau column otherwise', () => {
    const s = blank({
      talon: [makeCard('h', 7, true)],
      tableau: [
        [makeCard('s', 9, true)],
        [makeCard('s', 8, true)],
        [makeCard('c', 8, true)],
        [],
        [],
        [],
        [],
      ],
    });
    expect(findAutoMoveTarget(s, { kind: 'talon' })).toEqual({
      kind: 'talonToTableau',
      to: 1,
    });
  });

  it('returns null when no destination is legal', () => {
    const s = blank({ talon: [makeCard('h', 7, true)] });
    expect(findAutoMoveTarget(s, { kind: 'talon' })).toBeNull();
  });

  it('finds an empty foundation when the suit-indexed slot holds another suit', () => {
    // Player drag-dropped A♦ onto the leftmost (suit-indicator-says-hearts)
    // foundation slot. Now A♥ in the talon should still auto-move — to the
    // empty diamonds slot, since foundations have no fixed suit assignment.
    const s = blank({
      talon: [makeCard('h', 1, true)],
      foundations: [[makeCard('d', 1, true)], [], [makeCard('s', 1, true)], []],
    });
    expect(findAutoMoveTarget(s, { kind: 'talon' })).toEqual({
      kind: 'talonToFoundation',
      foundationIdx: 1,
    });
  });
});

describe('findAutoMoveTarget — tableau stack source', () => {
  it('prefers foundation over tableau-to-tableau when the click is on the top card', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    expect(findAutoMoveTarget(s, { kind: 'tableauStack', column: 0, cardIndex: 0 })).toEqual({
      kind: 'tableauToFoundation',
      from: 0,
      foundationIdx: 0,
    });
  });

  it('picks tableau column whose move keeps the most face-down cards exposed', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 13, true)],
        [makeCard('s', 8, true)],
        [makeCard('h', 9, false), makeCard('h', 9, false), makeCard('s', 8, true)],
        [],
        [],
        [],
        [makeCard('h', 7, true)],
      ],
    });
    const result = findAutoMoveTarget(s, {
      kind: 'tableauStack',
      column: 6,
      cardIndex: 0,
    });
    expect(result).toEqual({ kind: 'tableauToTableau', from: 6, cardIndex: 0, to: 2 });
  });

  it('moves a multi-card face-up stack from the clicked card down', () => {
    // Column 0: [♠K (top), ♥Q, ♣J, ♦10] — all face-up, J♣ + 10♦ form a valid stack.
    // Column 1: [♥Q] — red Q so J♣ (black) can land on it.
    const s = blank({
      tableau: [
        [
          makeCard('s', 13, true),
          makeCard('h', 12, true),
          makeCard('c', 11, true),
          makeCard('d', 10, true),
        ],
        [makeCard('h', 12, true)],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const result = findAutoMoveTarget(s, {
      kind: 'tableauStack',
      column: 0,
      cardIndex: 2,
    });
    expect(result).toEqual({ kind: 'tableauToTableau', from: 0, cardIndex: 2, to: 1 });
  });

  it('does not send a multi-card stack to foundation', () => {
    // Column has [A♥, 2♥]. Single 2♥ on top would normally go to foundation
    // after A♥ is placed, but a stack starting at A♥ cannot — foundation
    // takes one card at a time.
    const s = blank({
      tableau: [[makeCard('h', 1, true), makeCard('h', 2, true)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    const result = findAutoMoveTarget(s, {
      kind: 'tableauStack',
      column: 0,
      cardIndex: 0,
    });
    expect(result).toBeNull();
  });
});

describe('nextAutoCompleteMove', () => {
  it('returns the next tableau-to-foundation move when available', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    expect(nextAutoCompleteMove(s)).toEqual({
      kind: 'tableauToFoundation',
      from: 0,
      foundationIdx: 0,
    });
  });

  it('falls back to talon-to-foundation when no tableau move is available', () => {
    const s = blank({
      tableau: [[makeCard('h', 7, true)], [], [], [], [], [], []],
      talon: [makeCard('s', 1, true)],
    });
    // All foundations are empty; the Ace lands in the first one that accepts
    // it, since foundations have no pre-assigned suit.
    expect(nextAutoCompleteMove(s)).toEqual({
      kind: 'talonToFoundation',
      foundationIdx: 0,
    });
  });

  it('draws from stock when no foundation move is available', () => {
    const s = blank({
      tableau: [[makeCard('h', 7, true)], [], [], [], [], [], []],
      stock: [makeCard('s', 5, false)],
    });
    expect(nextAutoCompleteMove(s)).toEqual({ kind: 'draw', count: 1 });
  });

  it('returns null when nothing can move and stock is empty', () => {
    const s = blank({
      tableau: [[makeCard('h', 7, true)], [], [], [], [], [], []],
    });
    expect(nextAutoCompleteMove(s)).toBeNull();
  });

  it('recycles when stock is empty and the talon top has no legal foundation move', () => {
    // Tableau is fully face-up but inert (top is ♥7, foundations are empty).
    // Stock is empty and the talon top (♠5) cannot land on any foundation.
    // Without recycling here, the auto-complete loop would deadlock until
    // the user manually clicked the stock to recycle.
    const s = blank({
      tableau: [[makeCard('h', 7, true)], [], [], [], [], [], []],
      talon: [makeCard('s', 5, true)],
    });
    expect(nextAutoCompleteMove(s)).toEqual({ kind: 'recycle' });
  });

  it('prefers draw over recycle when stock still has cards', () => {
    const s = blank({
      tableau: [[makeCard('h', 7, true)], [], [], [], [], [], []],
      stock: [makeCard('c', 5, false)],
      talon: [makeCard('s', 5, true)],
    });
    expect(nextAutoCompleteMove(s)).toEqual({ kind: 'draw', count: 1 });
  });
});

describe('nextAutoCompleteMove — draw-3 completes winnable states', () => {
  // Mirrors the auto-complete loop in Board.tsx, including the recycle guard
  // that bails out once a full cycle makes no foundation progress.
  const runAutoComplete = (initial: GameState): boolean => {
    let state = initial;
    let lastRecycleFoundationTotal: number | null = null;
    for (let steps = 0; steps < 100000; steps++) {
      if (isWon(state)) return true;
      const move = nextAutoCompleteMove(state);
      if (move === null) return false;
      if (move.kind === 'recycle') {
        const total = state.foundations.reduce((n, p) => n + p.length, 0);
        if (lastRecycleFoundationTotal === total) return false;
        lastRecycleFoundationTotal = total;
      }
      state = applyMove(state, move);
    }
    return false;
  };

  // All 52 cards in the stock, empty tableau & foundations — trivially
  // winnable by ferrying. The four aces sit at stock indices that a 3-card
  // draw never surfaces as the talon top, so a draw-3 loop that drew 3 at a
  // time would stall short of a win (regression: "draw-3 can't be won").
  const buildStuckStock = (): Card[] => {
    const aces = SUITS.map((s) => makeCard(s, 1, false));
    const rest: Card[] = [];
    for (const s of SUITS) for (const r of RANKS) if (r !== 1) rest.push(makeCard(s, r, false));
    const stock = new Array<Card>(52);
    [3, 6, 9, 12].forEach((pos, i) => (stock[pos] = aces[i]));
    let cursor = 0;
    for (let i = 0; i < 52; i++) if (stock[i] === undefined) stock[i] = rest[cursor++];
    return stock;
  };

  it('wins a phase-hostile stock in draw-1 mode', () => {
    expect(runAutoComplete(blank({ drawCount: 1, stock: buildStuckStock() }))).toBe(true);
  });

  it('wins the same phase-hostile stock in draw-3 mode', () => {
    expect(runAutoComplete(blank({ drawCount: 3, stock: buildStuckStock() }))).toBe(true);
  });
});
