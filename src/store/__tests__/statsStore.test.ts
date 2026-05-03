import { beforeEach, describe, expect, it } from 'vitest';
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
});
