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

describe('findAutoMoveTarget — tableau top source', () => {
  it('prefers foundation over tableau-to-tableau', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    expect(findAutoMoveTarget(s, { kind: 'tableauTop', column: 0 })).toEqual({
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
        [], [], [],
        [makeCard('h', 7, true)],
      ],
    });
    const result = findAutoMoveTarget(s, { kind: 'tableauTop', column: 6 });
    expect(result).toEqual({ kind: 'tableauToTableau', from: 6, cardIndex: 0, to: 2 });
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
