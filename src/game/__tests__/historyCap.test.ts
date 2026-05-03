import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { applyMove } from '../moves';
import { blankGameState as blank } from '@/test-utils/factories';

describe('history cap', () => {
  it('caps history at 200 entries and drops the oldest when exceeded', () => {
    // Fabricate a stock large enough to draw 250 times (250 cards, alternating).
    const stock = Array.from({ length: 250 }, (_, i) => makeCard('h', ((i % 13) + 1) as 1));
    let s = blank({ stock });
    for (let i = 0; i < 250; i++) s = applyMove(s, { kind: 'draw' });

    expect(s.history.length).toBe(200);
    expect(s.movesMade).toBe(250);
  });

  it('snapshots in history have empty history themselves (no geometric blow-up)', () => {
    let s = blank({ stock: [makeCard('h', 1), makeCard('h', 2), makeCard('h', 3)] });
    s = applyMove(s, { kind: 'draw' });
    s = applyMove(s, { kind: 'draw' });
    s = applyMove(s, { kind: 'draw' });
    expect(s.history).toHaveLength(3);
    s.history.forEach((snap) => expect(snap.history).toEqual([]));
  });
});
