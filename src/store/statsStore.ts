import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { KEY_STATS, loadKey, saveKey } from '@/persistence/db';

export type ModeStats = {
  played: number;
  won: number;
  bestTimeSec: number | null;
  fewestMovesWin: number | null;
};

export type Stats = {
  schemaVersion: 1;
  byMode: { '1': ModeStats; '3': ModeStats };
  currentStreak: number;
  longestStreak: number;
  totalSecondsPlayed: number;
};

const emptyMode = (): ModeStats => ({
  played: 0,
  won: 0,
  bestTimeSec: null,
  fewestMovesWin: null,
});

export const defaultStats = (): Stats => ({
  schemaVersion: 1,
  byMode: { '1': emptyMode(), '3': emptyMode() },
  currentStreak: 0,
  longestStreak: 0,
  totalSecondsPlayed: 0,
});

export type RecordGameInput = {
  mode: 1 | 3;
  outcome: 'won' | 'abandoned';
  durationSec: number;
  moves: number;
};

type StatsStore = {
  stats: Stats;
  hydrate: (s: Stats) => void;
  recordGame: (input: RecordGameInput) => void;
  reset: () => void;
};

const persist = (stats: Stats) => void saveKey(KEY_STATS, stats.schemaVersion, stats);

export const useStatsStore = create<StatsStore>()(
  immer((set) => ({
    stats: defaultStats(),
    hydrate: (s) =>
      set((state) => {
        state.stats = s;
      }),
    recordGame: ({ mode, outcome, durationSec, moves }) =>
      set((state) => {
        const m = state.stats.byMode[String(mode) as '1' | '3'];
        m.played += 1;
        state.stats.totalSecondsPlayed += durationSec;
        if (outcome === 'won') {
          m.won += 1;
          if (m.bestTimeSec === null || durationSec < m.bestTimeSec) m.bestTimeSec = durationSec;
          if (m.fewestMovesWin === null || moves < m.fewestMovesWin) m.fewestMovesWin = moves;
          state.stats.currentStreak += 1;
          if (state.stats.currentStreak > state.stats.longestStreak) {
            state.stats.longestStreak = state.stats.currentStreak;
          }
        } else {
          state.stats.currentStreak = 0;
        }
        persist(state.stats);
      }),
    reset: () =>
      set((state) => {
        state.stats = defaultStats();
        persist(state.stats);
      }),
  })),
);

export const hydrateStatsFromStorage = async (): Promise<void> => {
  const loaded = await loadKey<Stats>(KEY_STATS);
  if (loaded && loaded.schemaVersion === 1) {
    useStatsStore.getState().hydrate(loaded);
  }
};
