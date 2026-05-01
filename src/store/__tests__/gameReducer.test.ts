import { describe, expect, it } from 'vitest';
import { makeCard } from '@/game/card';
import { GameState } from '@/game/state';
import { gameReducer } from '../gameReducer';

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

describe('gameReducer', () => {
  it('applies a legal move', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
    });
    const next = gameReducer(s, { type: 'move', move: { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 } });
    expect(next.foundations[0].map((c) => c.id)).toEqual(['h1']);
    expect(next.movesMade).toBe(1);
  });

  it('returns the same state for an illegal move (no throw)', () => {
    const s = blank({
      tableau: [[makeCard('h', 5, true)], [], [], [], [], [], []],
    });
    const next = gameReducer(s, { type: 'move', move: { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 } });
    expect(next).toBe(s);
  });

  it('undo unwinds the last move', () => {
    let s = blank({ stock: [makeCard('h', 1)] });
    s = gameReducer(s, { type: 'move', move: { kind: 'draw' } });
    expect(s.talon).toHaveLength(1);
    s = gameReducer(s, { type: 'undo' });
    expect(s.talon).toHaveLength(0);
    expect(s.stock).toHaveLength(1);
  });

  it('reset replaces state', () => {
    const a = blank({ seed: 'a' });
    const b = blank({ seed: 'b' });
    expect(gameReducer(a, { type: 'reset', state: b }).seed).toBe('b');
  });
});
