import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { canApply } from '../canApply';
import { blankGameState as blank } from '@/test-utils/factories';

describe('canApply', () => {
  it('returns true for a legal move without mutating state', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    expect(canApply(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 })).toBe(true);
    // Snapshot is unchanged
    expect(s.tableau[0]).toHaveLength(1);
    expect(s.foundations[0]).toHaveLength(0);
    expect(s.movesMade).toBe(0);
  });

  it('returns false for an illegal move (no throw, no mutation)', () => {
    const s = blank({
      tableau: [[makeCard('h', 5, true)], [], [], [], [], [], []],
    });
    expect(canApply(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 })).toBe(false);
    expect(s.tableau[0][0].rank).toBe(5);
  });

  it('rejects draw with empty stock and recycle with non-empty stock', () => {
    expect(canApply(blank({ stock: [] }), { kind: 'draw' })).toBe(false);
    expect(canApply(blank({ stock: [makeCard('h', 1)], talon: [] }), { kind: 'recycle' })).toBe(
      false,
    );
  });

  it('rejects tableau-to-tableau when from === to', () => {
    const s = blank({ tableau: [[makeCard('s', 13, true)], [], [], [], [], [], []] });
    expect(canApply(s, { kind: 'tableauToTableau', from: 0, cardIndex: 0, to: 0 })).toBe(false);
  });

  it('rejects out-of-range column / cardIndex without throwing', () => {
    const s = blank();
    expect(canApply(s, { kind: 'tableauToTableau', from: 0, cardIndex: 5, to: 1 })).toBe(false);
    expect(canApply(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 })).toBe(false);
  });
});
