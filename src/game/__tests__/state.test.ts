import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';

describe('createInitialState', () => {
  it('produces a fresh game with the expected shape', () => {
    const s = createInitialState({ drawCount: 1, seed: 'fixed' });
    expect(s.schemaVersion).toBe(1);
    expect(s.tableau).toHaveLength(7);
    s.tableau.forEach((col, i) => expect(col).toHaveLength(i + 1));
    expect(s.foundations).toEqual([[], [], [], []]);
    expect(s.talon).toEqual([]);
    expect(s.stock).toHaveLength(24);
    expect(s.drawCount).toBe(1);
    expect(s.movesMade).toBe(0);
    expect(s.redealCount).toBe(0);
    expect(s.history).toEqual([]);
    expect(s.seed).toBe('fixed');
    expect(typeof s.startedAt).toBe('number');
  });

  it('is reproducible given the same seed', () => {
    const a = createInitialState({ drawCount: 1, seed: 'alpha' });
    const b = createInitialState({ drawCount: 1, seed: 'alpha' });
    expect(a.tableau.map((c) => c.map((x) => x.id))).toEqual(
      b.tableau.map((c) => c.map((x) => x.id)),
    );
    expect(a.stock.map((c) => c.id)).toEqual(b.stock.map((c) => c.id));
  });

  it('honours drawCount = 3', () => {
    const s = createInitialState({ drawCount: 3, seed: 'x' });
    expect(s.drawCount).toBe(3);
  });

  it('generates a random seed if none given', () => {
    const s = createInitialState({ drawCount: 1 });
    expect(typeof s.seed).toBe('string');
    expect(s.seed.length).toBeGreaterThan(0);
  });
});
