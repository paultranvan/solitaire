import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { bestNextMove } from '../hints';
import { blankGameState as blank } from '@/test-utils/factories';

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
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(bestNextMove(s)).toEqual({
      kind: 'tableauToTableau',
      from: 1,
      cardIndex: 1,
      to: 0,
    });
  });

  it('suggests a draw when no board move helps but the stock is not empty', () => {
    // Drawing surfaces the A♠ in the stock — point the player at it rather
    // than reporting "no hint".
    const s = blank({
      stock: [makeCard('s', 1)],
      tableau: [[makeCard('h', 13, true)], [], [], [], [], [], []],
    });
    expect(bestNextMove(s)).toEqual({ kind: 'draw' });
  });

  it('suggests a recycle when the stock is spent but the talon still has cards', () => {
    const s = blank({
      stock: [],
      talon: [makeCard('s', 5, true)],
      tableau: [[makeCard('h', 13, true)], [], [], [], [], [], []],
    });
    expect(bestNextMove(s)).toEqual({ kind: 'recycle' });
  });

  it('returns null only when stock and talon are both empty', () => {
    const s = blank({
      tableau: [[makeCard('h', 13, true)], [], [], [], [], [], []],
    });
    expect(bestNextMove(s)).toBeNull();
  });
});
