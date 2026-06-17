import { describe, expect, it } from 'vitest';
import { computeScore } from '../score';

describe('computeScore', () => {
  it('is always positive for a winning game, flooring at the win bonus', () => {
    expect(computeScore({ durationSec: 30, moves: 80, drawCount: 1 })).toBeGreaterThan(0);
    // Both time and move bonuses saturate to zero, so only the flat win bonus remains.
    expect(computeScore({ durationSec: 9999, moves: 9999, drawCount: 1 })).toBe(500);
  });

  it('anchors the formula: 100 moves / 180s in draw-1 scores 8700', () => {
    // 500 (win) + (6000 - 10*180) time + (6000 - 20*100) moves = 500 + 4200 + 4000
    expect(computeScore({ durationSec: 180, moves: 100, drawCount: 1 })).toBe(8700);
  });

  it('ranks fewer-moves-but-slower above more-moves-but-faster (the reported case)', () => {
    const a = computeScore({ durationSec: 180, moves: 100, drawCount: 1 }); // 3 min, 100 moves
    const b = computeScore({ durationSec: 150, moves: 130, drawCount: 1 }); // 2.5 min, 130 moves
    expect(a).toBeGreaterThan(b);
  });

  it('weighs a move more than a second (a move costs 20, a second 10)', () => {
    const base = computeScore({ durationSec: 180, moves: 100, drawCount: 1 });
    const oneMoveFewer = computeScore({ durationSec: 180, moves: 99, drawCount: 1 });
    const oneSecondFewer = computeScore({ durationSec: 179, moves: 100, drawCount: 1 });
    expect(oneMoveFewer - base).toBe(20);
    expect(oneSecondFewer - base).toBe(10);
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

  it('the time bonus floors at zero past 600s — slower still never goes negative', () => {
    const atZero = computeScore({ durationSec: 600, moves: 100, drawCount: 1 });
    const wayPast = computeScore({ durationSec: 9999, moves: 100, drawCount: 1 });
    expect(atZero).toBe(wayPast); // move bonus + win bonus only
    expect(wayPast).toBeGreaterThan(0);
  });

  it('the move bonus floors at zero past 300 moves — extra moves never go negative', () => {
    const atZero = computeScore({ durationSec: 200, moves: 300, drawCount: 1 });
    const wayPast = computeScore({ durationSec: 200, moves: 5_000, drawCount: 1 });
    expect(atZero).toBe(wayPast); // time bonus + win bonus only
    expect(wayPast).toBeGreaterThan(0);
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
