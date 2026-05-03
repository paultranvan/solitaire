import { describe, expect, it } from 'vitest';
import { computeScore } from '../score';

describe('computeScore', () => {
  it('is always positive for a winning game', () => {
    expect(computeScore({ durationSec: 30, moves: 80, drawCount: 1 })).toBeGreaterThan(0);
    expect(computeScore({ durationSec: 9999, moves: 9999, drawCount: 1 })).toBeGreaterThan(0);
  });

  it('a faster win scores higher than a slower win at the same moves', () => {
    const fast = computeScore({ durationSec: 90, moves: 120, drawCount: 1 });
    const slow = computeScore({ durationSec: 360, moves: 120, drawCount: 1 });
    expect(fast).toBeGreaterThan(slow);
  });

  it('a more efficient win scores higher than a sloppier win at the same time', () => {
    const tidy = computeScore({ durationSec: 180, moves: 100, drawCount: 1 });
    const sloppy = computeScore({ durationSec: 180, moves: 240, drawCount: 1 });
    expect(tidy).toBeGreaterThan(sloppy);
  });

  it('clamps the time bonus below 30s so impossibly fast wins do not blow up', () => {
    const a = computeScore({ durationSec: 1, moves: 100, drawCount: 1 });
    const b = computeScore({ durationSec: 30, moves: 100, drawCount: 1 });
    expect(a).toBe(b);
  });

  it('the efficiency bonus floors at zero — extra moves never produce a negative term', () => {
    const lots = computeScore({ durationSec: 300, moves: 5_000, drawCount: 1 });
    const baseline = computeScore({ durationSec: 300, moves: 250, drawCount: 1 });
    // both should equal the time-only contribution
    expect(lots).toBe(baseline);
    expect(lots).toBeGreaterThan(0);
  });

  it('draw-3 wins are exactly double the equivalent draw-1 score', () => {
    const d1 = computeScore({ durationSec: 200, moves: 130, drawCount: 1 });
    const d3 = computeScore({ durationSec: 200, moves: 130, drawCount: 3 });
    expect(d3).toBe(d1 * 2);
  });

  it('returns an integer', () => {
    const s = computeScore({ durationSec: 137, moves: 113, drawCount: 1 });
    expect(Number.isInteger(s)).toBe(true);
  });
});
