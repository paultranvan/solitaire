import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultStats, useStatsStore } from '../statsStore';

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

describe('statsStore.recordGame — win records', () => {
  beforeEach(() => {
    useStatsStore.setState({ stats: defaultStats() });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('appends a WinRecord on a win with score', () => {
    useStatsStore.getState().recordGame({
      mode: 1,
      outcome: 'won',
      durationSec: 192,
      moves: 142,
      score: 8420,
    });
    const wins = useStatsStore.getState().stats.byMode['1'].wins;
    expect(wins).toHaveLength(1);
    expect(wins[0]).toEqual({
      score: 8420,
      durationSec: 192,
      moves: 142,
      dateMs: new Date('2026-05-14T10:00:00Z').getTime(),
    });
  });

  it('does not append a WinRecord for an abandoned game', () => {
    useStatsStore.getState().recordGame({
      mode: 1,
      outcome: 'abandoned',
      durationSec: 30,
      moves: 5,
    });
    expect(useStatsStore.getState().stats.byMode['1'].wins).toHaveLength(0);
  });

  it('does not append a WinRecord for a win with no score', () => {
    useStatsStore.getState().recordGame({
      mode: 1,
      outcome: 'won',
      durationSec: 100,
      moves: 50,
    });
    expect(useStatsStore.getState().stats.byMode['1'].wins).toHaveLength(0);
  });
});
