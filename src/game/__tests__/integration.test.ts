import { describe, expect, it } from 'vitest';
import { applyMove, createInitialState, undo } from '../index';

describe('engine integration', () => {
  it('produces a deterministic deal and runs a sequence of legal moves', () => {
    const s0 = createInitialState({ drawCount: 1, seed: 'integration-1' });
    expect(s0.tableau).toHaveLength(7);
    expect(s0.stock).toHaveLength(24);

    let s = s0;
    for (let i = 0; i < 3; i++) s = applyMove(s, { kind: 'draw' });
    expect(s.movesMade).toBe(3);
    expect(s.history).toHaveLength(3);
    expect(s.talon.length).toBe(3);
  });

  it('undo returns to the initial state after any number of legal moves', () => {
    let s = createInitialState({ drawCount: 1, seed: 'integration-2' });
    const original = s;
    for (let i = 0; i < 5; i++) s = applyMove(s, { kind: 'draw' });
    while (s.history.length > 0) s = undo(s);
    expect(s.tableau.map((c) => c.map((x) => x.id))).toEqual(
      original.tableau.map((c) => c.map((x) => x.id)),
    );
    expect(s.stock.map((c) => c.id)).toEqual(original.stock.map((c) => c.id));
    expect(s.talon).toEqual([]);
    expect(s.movesMade).toBe(original.movesMade);
  });

  it('drawing through the full stock then recycling yields the same talon order', () => {
    const s0 = createInitialState({ drawCount: 1, seed: 'integration-3' });
    let s = s0;
    while (s.stock.length > 0) s = applyMove(s, { kind: 'draw' });
    expect(s.talon.length).toBe(24);
    const talonIdsBeforeRecycle = s.talon.map((c) => c.id);

    s = applyMove(s, { kind: 'recycle' });
    expect(s.stock.length).toBe(24);
    expect(s.talon).toEqual([]);
    expect(s.redealCount).toBe(1);

    let s2 = s;
    while (s2.stock.length > 0) s2 = applyMove(s2, { kind: 'draw' });
    expect(s2.talon.map((c) => c.id)).toEqual(talonIdsBeforeRecycle);
  });
});
