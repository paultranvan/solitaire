import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { bestNextMove } from '../hints';
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

describe('bestNextMove', () => {
  it('prefers talon-to-foundation when an Ace is on the talon', () => {
    const s = blank({ talon: [makeCard('h', 1, true)] });
    expect(bestNextMove(s)).toEqual({ kind: 'talonToFoundation', foundationIdx: 0 });
  });

  it('prefers tableau-to-foundation when a tableau top is eligible', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    expect(bestNextMove(s)).toEqual({ kind: 'tableauToFoundation', from: 0, foundationIdx: 0 });
  });

  it('falls back to a tableau-to-tableau move that exposes a face-down card', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 8, true)],
        [makeCard('h', 1, false), makeCard('h', 7, true)],
        [], [], [], [], [],
      ],
    });
    expect(bestNextMove(s)).toEqual({
      kind: 'tableauToTableau',
      from: 1,
      cardIndex: 1,
      to: 0,
    });
  });

  it('returns null when no move helps progress', () => {
    const s = blank({
      stock: [makeCard('s', 1)],
      tableau: [[makeCard('h', 13, true)], [], [], [], [], [], []],
    });
    expect(bestNextMove(s)).toBeNull();
  });
});
