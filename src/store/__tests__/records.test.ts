import { describe, expect, it } from 'vitest';
import type { GameRecord } from '../statsStore';
import { modeWins, rankWin, topScores } from '../records';

const won = (
  score: number,
  durationSec: number,
  moves: number,
  drawCount: 1 | 3 = 1,
): GameRecord => ({
  outcome: 'won',
  score,
  durationSec,
  moves,
  dateMs: 0,
  drawCount,
  seed: '',
  redealCount: 0,
  hintsUsed: 0,
  undosUsed: 0,
});

const abandoned = (drawCount: 1 | 3 = 1): GameRecord => ({
  outcome: 'abandoned',
  score: null,
  durationSec: 10,
  moves: 3,
  dateMs: 0,
  drawCount,
  seed: '',
  redealCount: 0,
  hintsUsed: 0,
  undosUsed: 0,
});

describe('modeWins', () => {
  it('keeps only scored wins of the requested mode', () => {
    const games = [won(100, 0, 0, 1), abandoned(1), won(200, 0, 0, 3), won(300, 0, 0, 1)];
    expect(modeWins(games, 1).map((g) => g.score)).toEqual([100, 300]);
    expect(modeWins(games, 3).map((g) => g.score)).toEqual([200]);
  });

  it('returns an empty array when there are no wins', () => {
    expect(modeWins([abandoned(1)], 1)).toEqual([]);
  });
});

describe('topScores', () => {
  it('returns up to n wins sorted by score descending', () => {
    const wins = modeWins([won(100, 0, 0), won(300, 0, 0), won(200, 0, 0)], 1);
    expect(topScores(wins, 10).map((r) => r.score)).toEqual([300, 200, 100]);
  });

  it('caps at n', () => {
    const wins = modeWins(
      Array.from({ length: 15 }, (_, i) => won(i, 0, 0)),
      1,
    );
    expect(topScores(wins, 10)).toHaveLength(10);
    expect(topScores(wins, 10)[0].score).toBe(14);
  });

  it('returns an empty array for no wins', () => {
    expect(topScores([], 10)).toEqual([]);
  });
});

describe('rankWin', () => {
  it('ranks the top score #1 of total', () => {
    const wins = modeWins([won(100, 200, 150), won(300, 100, 120), won(200, 150, 130)], 1);
    const r = rankWin(wins, { score: 300, durationSec: 100, moves: 120 });
    expect(r.rank).toBe(1);
    expect(r.total).toBe(3);
  });

  it('ranks a mid score correctly', () => {
    const wins = modeWins([won(100, 0, 0), won(300, 0, 0), won(200, 0, 0)], 1);
    expect(rankWin(wins, { score: 200, durationSec: 0, moves: 0 }).rank).toBe(2);
  });

  it('gives tied scores the same (competition) rank', () => {
    const wins = modeWins([won(300, 0, 0), won(300, 0, 0), won(100, 0, 0)], 1);
    expect(rankWin(wins, { score: 300, durationSec: 0, moves: 0 }).rank).toBe(1);
    expect(rankWin(wins, { score: 100, durationSec: 0, moves: 0 }).rank).toBe(3);
  });

  it('awards time and moves medals for top-3 placement', () => {
    const wins = modeWins([won(0, 100, 120), won(0, 200, 200), won(0, 300, 300)], 1);
    const r = rankWin(wins, { score: 0, durationSec: 100, moves: 120 });
    expect(r.timeMedal).toBe(1);
    expect(r.movesMedal).toBe(1);
  });

  it('gives no medal outside the top 3', () => {
    const wins = modeWins([won(0, 10, 10), won(0, 20, 20), won(0, 30, 30), won(0, 40, 40)], 1);
    const r = rankWin(wins, { score: 0, durationSec: 40, moves: 40 });
    expect(r.timeMedal).toBe(0);
    expect(r.movesMedal).toBe(0);
  });

  it('handles a sole win — rank 1 of 1, both medals gold', () => {
    const wins = modeWins([won(500, 90, 100)], 1);
    expect(rankWin(wins, { score: 500, durationSec: 90, moves: 100 })).toEqual({
      rank: 1,
      total: 1,
      timeMedal: 1,
      movesMedal: 1,
    });
  });
});
