import { describe, expect, it } from 'vitest';
import type { WinRecord } from '../statsStore';
import { rankWin, topScores } from '../records';

const w = (score: number, durationSec: number, moves: number): WinRecord => ({
  score,
  durationSec,
  moves,
  dateMs: 0,
});

describe('topScores', () => {
  it('returns up to n wins sorted by score descending', () => {
    const wins = [w(100, 0, 0), w(300, 0, 0), w(200, 0, 0)];
    expect(topScores(wins, 10).map((r) => r.score)).toEqual([300, 200, 100]);
  });

  it('caps at n', () => {
    const wins = Array.from({ length: 15 }, (_, i) => w(i, 0, 0));
    expect(topScores(wins, 10)).toHaveLength(10);
    expect(topScores(wins, 10)[0].score).toBe(14);
  });

  it('returns an empty array for no wins', () => {
    expect(topScores([], 10)).toEqual([]);
  });
});

describe('rankWin', () => {
  it('ranks the top score #1 of total', () => {
    const wins = [w(100, 200, 150), w(300, 100, 120), w(200, 150, 130)];
    const r = rankWin(wins, { score: 300, durationSec: 100, moves: 120 });
    expect(r.rank).toBe(1);
    expect(r.total).toBe(3);
  });

  it('ranks a mid score correctly', () => {
    const wins = [w(100, 0, 0), w(300, 0, 0), w(200, 0, 0)];
    expect(rankWin(wins, { score: 200, durationSec: 0, moves: 0 }).rank).toBe(2);
  });

  it('gives tied scores the same (competition) rank', () => {
    const wins = [w(300, 0, 0), w(300, 0, 0), w(100, 0, 0)];
    expect(rankWin(wins, { score: 300, durationSec: 0, moves: 0 }).rank).toBe(1);
    expect(rankWin(wins, { score: 100, durationSec: 0, moves: 0 }).rank).toBe(3);
  });

  it('awards time and moves medals for top-3 placement', () => {
    const wins = [w(0, 100, 120), w(0, 200, 200), w(0, 300, 300)];
    const r = rankWin(wins, { score: 0, durationSec: 100, moves: 120 });
    expect(r.timeMedal).toBe(1);
    expect(r.movesMedal).toBe(1);
  });

  it('gives no medal outside the top 3', () => {
    const wins = [w(0, 10, 10), w(0, 20, 20), w(0, 30, 30), w(0, 40, 40)];
    const r = rankWin(wins, { score: 0, durationSec: 40, moves: 40 });
    expect(r.timeMedal).toBe(0);
    expect(r.movesMedal).toBe(0);
  });

  it('handles a sole win — rank 1 of 1, both medals gold', () => {
    const wins = [w(500, 90, 100)];
    const r = rankWin(wins, { score: 500, durationSec: 90, moves: 100 });
    expect(r).toEqual({ rank: 1, total: 1, timeMedal: 1, movesMedal: 1 });
  });
});
