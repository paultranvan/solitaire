import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { KEY_STATS, loadKey, saveKey } from '@/persistence/db';

export type WinRecord = {
  score: number;
  durationSec: number;
  moves: number;
  dateMs: number;
};

export type ModeStats = {
  played: number;
  won: number;
  bestTimeSec: number | null;
  fewestMovesWin: number | null;
  bestScore: number | null;
  wins: WinRecord[];
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
  bestScore: null,
  wins: [],
});

// Older saves predate `bestScore`; merge in a default so reads stay safe.
const normalizeMode = (m: ModeStats): ModeStats => ({ ...emptyMode(), ...m });
const normalizeStats = (s: Stats): Stats => ({
  ...s,
  byMode: { '1': normalizeMode(s.byMode['1']), '3': normalizeMode(s.byMode['3']) },
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
  // Only meaningful for wins; ignored for abandoned games.
  score?: number;
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
    // persist() must run AFTER set() returns, not inside the producer: idb-keyval's
    // write opens the DB asynchronously and only structured-clones the value once
    // dbp resolves, by which point immer has revoked the draft proxy and the put
    // throws (silently — saveKey swallows it).
    recordGame: ({ mode, outcome, durationSec, moves, score }) => {
      set((state) => {
        const m = state.stats.byMode[String(mode) as '1' | '3'];
        m.played += 1;
        state.stats.totalSecondsPlayed += durationSec;
        if (outcome === 'won') {
          m.won += 1;
          if (m.bestTimeSec === null || durationSec < m.bestTimeSec) m.bestTimeSec = durationSec;
          if (m.fewestMovesWin === null || moves < m.fewestMovesWin) m.fewestMovesWin = moves;
          if (score !== undefined && (m.bestScore === null || score > m.bestScore)) {
            m.bestScore = score;
          }
          if (score !== undefined) {
            m.wins.push({ score, durationSec, moves, dateMs: Date.now() });
          }
          state.stats.currentStreak += 1;
          if (state.stats.currentStreak > state.stats.longestStreak) {
            state.stats.longestStreak = state.stats.currentStreak;
          }
        } else {
          state.stats.currentStreak = 0;
        }
      });
      persist(useStatsStore.getState().stats);
    },
    reset: () => {
      set((state) => {
        state.stats = defaultStats();
      });
      persist(useStatsStore.getState().stats);
    },
  })),
);

export const hydrateStatsFromStorage = async (): Promise<void> => {
  const loaded = await loadKey<Stats>(KEY_STATS);
  if (loaded && loaded.schemaVersion === 1) {
    useStatsStore.getState().hydrate(normalizeStats(loaded));
  }
};
