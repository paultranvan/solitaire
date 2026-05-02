import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { findAutoMoveTarget, nextAutoCompleteMove } from '../auto';
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
        [], [], [], [],
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
});

describe('findAutoMoveTarget — tableau stack source', () => {
  it('prefers foundation over tableau-to-tableau when the click is on the top card', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    expect(
      findAutoMoveTarget(s, { kind: 'tableauStack', column: 0, cardIndex: 0 }),
    ).toEqual({ kind: 'tableauToFoundation', from: 0, foundationIdx: 0 });
  });

  it('picks tableau column whose move keeps the most face-down cards exposed', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 13, true)],
        [makeCard('s', 8, true)],
        [makeCard('h', 9, false), makeCard('h', 9, false), makeCard('s', 8, true)],
        [], [], [],
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
        [], [], [], [], [],
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
  it('returns the next move during auto-complete', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    expect(nextAutoCompleteMove(s)).toEqual({
      kind: 'tableauToFoundation',
      from: 0,
      foundationIdx: 0,
    });
  });

  it('returns null when nothing can move to a foundation', () => {
    const s = blank({
      tableau: [[makeCard('h', 7, true)], [], [], [], [], [], []],
    });
    expect(nextAutoCompleteMove(s)).toBeNull();
  });
});
