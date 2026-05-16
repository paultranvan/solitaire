import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { KEY_STATS, loadKey, saveKey } from '@/persistence/db';

// One record per finished game (won or abandoned). The flat `Stats.games` log
// of these is the raw event source future stats can be derived from; the
// per-mode aggregates below are a cache over it.
export type GameRecord = {
  outcome: 'won' | 'abandoned';
  score: number | null; // null unless a scored win
  durationSec: number;
  moves: number;
  dateMs: number;
  drawCount: 1 | 3;
  seed: string;
  redealCount: number;
  hintsUsed: number;
  undosUsed: number;
};

export type ModeStats = {
  played: number;
  won: number;
  bestTimeSec: number | null;
  fewestMovesWin: number | null;
  bestScore: number | null;
};

export type Stats = {
  schemaVersion: 1;
  byMode: { '1': ModeStats; '3': ModeStats };
  currentStreak: number;
  longestStreak: number;
  totalSecondsPlayed: number;
  games: GameRecord[];
};

const emptyMode = (): ModeStats => ({
  played: 0,
  won: 0,
  bestTimeSec: null,
  fewestMovesWin: null,
  bestScore: null,
});

// Build each mode explicitly so a legacy `wins` field (previous schema) is
// dropped rather than spread through onto the normalized object.
const normalizeMode = (m: Partial<ModeStats> | undefined): ModeStats => ({
  played: m?.played ?? 0,
  won: m?.won ?? 0,
  bestTimeSec: m?.bestTimeSec ?? null,
  fewestMovesWin: m?.fewestMovesWin ?? null,
  bestScore: m?.bestScore ?? null,
});

// Previous schema kept per-mode `wins` arrays. Fold them into the flat log;
// fields the old record never stored default to empty/zero.
type LegacyWin = Pick<GameRecord, 'score' | 'durationSec' | 'moves' | 'dateMs'>;
const migrateLegacyWins = (s: Stats): GameRecord[] => {
  const out: GameRecord[] = [];
  for (const dc of [1, 3] as const) {
    const legacy = (s.byMode?.[String(dc) as '1' | '3'] as { wins?: LegacyWin[] } | undefined)
      ?.wins;
    if (Array.isArray(legacy)) {
      for (const w of legacy) {
        out.push({
          outcome: 'won',
          score: w.score,
          durationSec: w.durationSec,
          moves: w.moves,
          dateMs: w.dateMs,
          drawCount: dc,
          seed: '',
          redealCount: 0,
          hintsUsed: 0,
          undosUsed: 0,
        });
      }
    }
  }
  return out.sort((a, b) => a.dateMs - b.dateMs);
};

const normalizeStats = (s: Stats): Stats => ({
  schemaVersion: 1,
  byMode: { '1': normalizeMode(s.byMode?.['1']), '3': normalizeMode(s.byMode?.['3']) },
  currentStreak: s.currentStreak ?? 0,
  longestStreak: s.longestStreak ?? 0,
  totalSecondsPlayed: s.totalSecondsPlayed ?? 0,
  games: Array.isArray(s.games) ? s.games : migrateLegacyWins(s),
});

export const defaultStats = (): Stats => ({
  schemaVersion: 1,
  byMode: { '1': emptyMode(), '3': emptyMode() },
  currentStreak: 0,
  longestStreak: 0,
  totalSecondsPlayed: 0,
  games: [],
});

export type RecordGameInput = {
  mode: 1 | 3;
  outcome: 'won' | 'abandoned';
  durationSec: number;
  moves: number;
  // Only meaningful for wins; ignored for abandoned games.
  score?: number;
  // Always supplied by the game (Board); optional only to spare test churn.
  seed?: string;
  redealCount?: number;
  hintsUsed?: number;
  undosUsed?: number;
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
    recordGame: ({
      mode,
      outcome,
      durationSec,
      moves,
      score,
      seed = '',
      redealCount = 0,
      hintsUsed = 0,
      undosUsed = 0,
    }) => {
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
          state.stats.currentStreak += 1;
          if (state.stats.currentStreak > state.stats.longestStreak) {
            state.stats.longestStreak = state.stats.currentStreak;
          }
        } else {
          state.stats.currentStreak = 0;
        }
        // Append the raw record for every game — won or abandoned.
        state.stats.games.push({
          outcome,
          score: score ?? null,
          durationSec,
          moves,
          dateMs: Date.now(),
          drawCount: mode,
          seed,
          redealCount,
          hintsUsed,
          undosUsed,
        });
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
