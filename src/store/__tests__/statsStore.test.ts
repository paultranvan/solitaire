import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultStats, useStatsStore, type GameRecord } from '../statsStore';

describe('statsStore.recordGame', () => {
  beforeEach(() => {
    useStatsStore.setState({ stats: defaultStats() });
  });

  it('records a win: bumps played/won, sets best time and fewest moves, grows streak', () => {
    useStatsStore.getState().recordGame({
      mode: 1,
      outcome: 'won',
      durationSec: 120,
      moves: 80,
    });
    const stats = useStatsStore.getState().stats;
    expect(stats.byMode['1'].played).toBe(1);
    expect(stats.byMode['1'].won).toBe(1);
    expect(stats.byMode['1'].bestTimeSec).toBe(120);
    expect(stats.byMode['1'].fewestMovesWin).toBe(80);
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(stats.totalSecondsPlayed).toBe(120);
  });

  it('a slower or longer win does not regress best-time / fewest-moves', () => {
    const rec = useStatsStore.getState().recordGame;
    rec({ mode: 1, outcome: 'won', durationSec: 100, moves: 50 });
    rec({ mode: 1, outcome: 'won', durationSec: 200, moves: 90 });
    const m = useStatsStore.getState().stats.byMode['1'];
    expect(m.bestTimeSec).toBe(100);
    expect(m.fewestMovesWin).toBe(50);
  });

  it('an abandoned game resets the current streak but does not increment won', () => {
    const rec = useStatsStore.getState().recordGame;
    rec({ mode: 3, outcome: 'won', durationSec: 100, moves: 60 });
    rec({ mode: 3, outcome: 'won', durationSec: 100, moves: 60 });
    expect(useStatsStore.getState().stats.currentStreak).toBe(2);
    rec({ mode: 3, outcome: 'abandoned', durationSec: 30, moves: 5 });
    const stats = useStatsStore.getState().stats;
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(2); // monotonic
    expect(stats.byMode['3'].played).toBe(3);
    expect(stats.byMode['3'].won).toBe(2);
  });

  it('totalSecondsPlayed accumulates across both modes and outcomes', () => {
    const rec = useStatsStore.getState().recordGame;
    rec({ mode: 1, outcome: 'won', durationSec: 60, moves: 80 });
    rec({ mode: 3, outcome: 'abandoned', durationSec: 30, moves: 4 });
    expect(useStatsStore.getState().stats.totalSecondsPlayed).toBe(90);
  });

  it('best score only grows on wins and never regresses', () => {
    const rec = useStatsStore.getState().recordGame;
    rec({ mode: 1, outcome: 'won', durationSec: 120, moves: 80, score: 5000 });
    expect(useStatsStore.getState().stats.byMode['1'].bestScore).toBe(5000);
    rec({ mode: 1, outcome: 'won', durationSec: 200, moves: 200, score: 2000 });
    expect(useStatsStore.getState().stats.byMode['1'].bestScore).toBe(5000);
    rec({ mode: 1, outcome: 'won', durationSec: 60, moves: 70, score: 9000 });
    expect(useStatsStore.getState().stats.byMode['1'].bestScore).toBe(9000);
    rec({ mode: 1, outcome: 'abandoned', durationSec: 10, moves: 3, score: 99999 });
    expect(useStatsStore.getState().stats.byMode['1'].bestScore).toBe(9000);
  });

  it('omitting score on a win leaves bestScore untouched', () => {
    const rec = useStatsStore.getState().recordGame;
    rec({ mode: 3, outcome: 'won', durationSec: 90, moves: 70 });
    expect(useStatsStore.getState().stats.byMode['3'].bestScore).toBeNull();
  });
});

describe('statsStore.recordGame — game log', () => {
  beforeEach(() => {
    useStatsStore.setState({ stats: defaultStats() });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('appends a won GameRecord with all fields', () => {
    useStatsStore.getState().recordGame({
      mode: 1,
      outcome: 'won',
      durationSec: 192,
      moves: 142,
      score: 8420,
      seed: 'abc',
      redealCount: 2,
      hintsUsed: 3,
      undosUsed: 1,
    });
    const games = useStatsStore.getState().stats.games;
    expect(games).toHaveLength(1);
    expect(games[0]).toEqual({
      outcome: 'won',
      score: 8420,
      durationSec: 192,
      moves: 142,
      dateMs: new Date('2026-05-14T10:00:00Z').getTime(),
      drawCount: 1,
      seed: 'abc',
      redealCount: 2,
      hintsUsed: 3,
      undosUsed: 1,
    });
  });

  it('appends an abandoned GameRecord with a null score', () => {
    useStatsStore.getState().recordGame({
      mode: 1,
      outcome: 'abandoned',
      durationSec: 30,
      moves: 5,
    });
    const games = useStatsStore.getState().stats.games;
    expect(games).toHaveLength(1);
    expect(games[0].outcome).toBe('abandoned');
    expect(games[0].score).toBeNull();
  });

  it('records a null score for a win logged without a score', () => {
    useStatsStore.getState().recordGame({
      mode: 1,
      outcome: 'won',
      durationSec: 100,
      moves: 50,
    });
    const games = useStatsStore.getState().stats.games;
    expect(games).toHaveLength(1);
    expect(games[0].score).toBeNull();
  });
});

describe('statsStore.mergeImported', () => {
  const rec = (over: Partial<GameRecord> = {}): GameRecord => ({
    outcome: 'won',
    score: 1000,
    durationSec: 100,
    moves: 70,
    dateMs: 1716000000000,
    drawCount: 1,
    seed: 's1',
    redealCount: 0,
    hintsUsed: 0,
    undosUsed: 0,
    ...over,
  });

  beforeEach(() => {
    useStatsStore.setState({ stats: defaultStats() });
  });

  it('on an empty store, reproduces source aggregates exactly', () => {
    const games: GameRecord[] = [
      rec({
        seed: 'a',
        dateMs: 1,
        drawCount: 1,
        outcome: 'won',
        durationSec: 90,
        moves: 50,
        score: 2000,
      }),
      rec({
        seed: 'b',
        dateMs: 2,
        drawCount: 1,
        outcome: 'won',
        durationSec: 120,
        moves: 80,
        score: 1500,
      }),
      rec({
        seed: 'c',
        dateMs: 3,
        drawCount: 3,
        outcome: 'abandoned',
        score: null,
        durationSec: 30,
        moves: 5,
      }),
    ];
    const result = useStatsStore.getState().mergeImported(games);
    expect(result).toEqual({ added: 3, skipped: 0 });
    const s = useStatsStore.getState().stats;
    expect(s.games).toHaveLength(3);
    expect(s.byMode['1'].played).toBe(2);
    expect(s.byMode['1'].won).toBe(2);
    expect(s.byMode['1'].bestTimeSec).toBe(90);
    expect(s.byMode['1'].fewestMovesWin).toBe(50);
    expect(s.byMode['1'].bestScore).toBe(2000);
    expect(s.byMode['3'].played).toBe(1);
    expect(s.byMode['3'].won).toBe(0);
    expect(s.totalSecondsPlayed).toBe(240);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(2);
  });

  it('dedupes by seed|dateMs|outcome and reports skipped count', () => {
    const a = rec({ seed: 'a', dateMs: 1, outcome: 'won' });
    const b = rec({ seed: 'b', dateMs: 2, outcome: 'won' });
    useStatsStore.getState().mergeImported([a, b]);
    const result = useStatsStore
      .getState()
      .mergeImported([a, b, rec({ seed: 'c', dateMs: 3, outcome: 'won' })]);
    expect(result).toEqual({ added: 1, skipped: 2 });
    expect(useStatsStore.getState().stats.games).toHaveLength(3);
  });

  it('time-sorted streak walk: an abandoned game later than wins resets currentStreak', () => {
    useStatsStore.getState().mergeImported([
      rec({ seed: 'w1', dateMs: 100, outcome: 'won' }),
      rec({ seed: 'w2', dateMs: 200, outcome: 'won' }),
    ]);
    expect(useStatsStore.getState().stats.currentStreak).toBe(2);
    useStatsStore
      .getState()
      .mergeImported([rec({ seed: 'a1', dateMs: 300, outcome: 'abandoned', score: null })]);
    const s = useStatsStore.getState().stats;
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(2);
  });

  it('per-mode bestScore, bestTime, fewestMoves recomputed across merged log', () => {
    useStatsStore.getState().mergeImported([
      rec({
        seed: 'a',
        dateMs: 1,
        drawCount: 3,
        outcome: 'won',
        durationSec: 200,
        moves: 100,
        score: 500,
      }),
    ]);
    useStatsStore.getState().mergeImported([
      rec({
        seed: 'b',
        dateMs: 2,
        drawCount: 3,
        outcome: 'won',
        durationSec: 80,
        moves: 40,
        score: 9000,
      }),
    ]);
    const m = useStatsStore.getState().stats.byMode['3'];
    expect(m.bestTimeSec).toBe(80);
    expect(m.fewestMovesWin).toBe(40);
    expect(m.bestScore).toBe(9000);
  });

  it('null scores in wins are ignored for bestScore', () => {
    useStatsStore
      .getState()
      .mergeImported([rec({ seed: 'a', dateMs: 1, outcome: 'won', score: null })]);
    expect(useStatsStore.getState().stats.byMode['1'].bestScore).toBeNull();
  });
});
