import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { computeScore } from '@/game/score';
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

// Upper bounds for anything read back from storage or an imported backup.
// Both are untrusted (hand-edited file, another app sharing the origin's
// IndexedDB, a downgrade), so values outside these are rejected rather than
// allowed to poison the aggregates with NaN / Infinity / absurd totals.
const MAX_COUNTER = 1e9;
const MAX_DATE_MS = 8.64e15; // largest timestamp a Date can represent
const MAX_SEED_LENGTH = 128;

const isBoundedNumber = (v: unknown, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;

// Validates an untrusted value as a GameRecord and returns a fresh object
// holding only the known fields, or null if any field is missing or out of
// range. Rebuilding (rather than passing the input through) drops unknown
// keys, so stray payload never reaches the store or IndexedDB.
export const sanitizeGameRecord = (raw: unknown): GameRecord | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const { outcome, drawCount, durationSec, moves, dateMs, seed } = o;
  const { redealCount, hintsUsed, undosUsed } = o;
  const score = o.score ?? null;
  if (outcome !== 'won' && outcome !== 'abandoned') return null;
  if (drawCount !== 1 && drawCount !== 3) return null;
  if (score !== null && !isBoundedNumber(score, MAX_COUNTER)) return null;
  if (!isBoundedNumber(durationSec, MAX_COUNTER)) return null;
  if (!isBoundedNumber(moves, MAX_COUNTER)) return null;
  if (!isBoundedNumber(dateMs, MAX_DATE_MS)) return null;
  if (typeof seed !== 'string' || seed.length > MAX_SEED_LENGTH) return null;
  if (!isBoundedNumber(redealCount, MAX_COUNTER)) return null;
  if (!isBoundedNumber(hintsUsed, MAX_COUNTER)) return null;
  if (!isBoundedNumber(undosUsed, MAX_COUNTER)) return null;
  return {
    outcome,
    score,
    durationSec,
    moves,
    dateMs,
    drawCount,
    seed,
    redealCount,
    hintsUsed,
    undosUsed,
  };
};

const sanitizeGameRecords = (raw: readonly unknown[]): GameRecord[] => {
  const out: GameRecord[] = [];
  for (const r of raw) {
    const clean = sanitizeGameRecord(r);
    if (clean) out.push(clean);
  }
  return out;
};

// Previous schema kept per-mode `wins` arrays. Fold them into the flat log;
// fields the old record never stored default to empty/zero.
// The result is unvalidated — normalizeStats runs it through the sanitizer.
const migrateLegacyWins = (s: Stats): unknown[] => {
  const out: unknown[] = [];
  for (const dc of [1, 3] as const) {
    const legacy = (s.byMode?.[String(dc) as '1' | '3'] as { wins?: unknown } | undefined)?.wins;
    if (!Array.isArray(legacy)) continue;
    for (const w of legacy) {
      if (typeof w !== 'object' || w === null) continue;
      const { score, durationSec, moves, dateMs } = w as Record<string, unknown>;
      out.push({
        outcome: 'won',
        score,
        durationSec,
        moves,
        dateMs,
        drawCount: dc,
        seed: '',
        redealCount: 0,
        hintsUsed: 0,
        undosUsed: 0,
      });
    }
  }
  return out;
};

export const defaultStats = (): Stats => ({
  schemaVersion: 1,
  byMode: { '1': emptyMode(), '3': emptyMode() },
  currentStreak: 0,
  longestStreak: 0,
  totalSecondsPlayed: 0,
  games: [],
});

const dedupeKey = (r: GameRecord): string => `${r.seed}|${r.dateMs}|${r.outcome}`;

// Re-derive every cached aggregate from the time-sorted game log so the
// post-merge state is independent of insert order or the imported file's
// own aggregate values.
const recomputeAggregates = (games: GameRecord[]): Omit<Stats, 'schemaVersion' | 'games'> => {
  const sorted = [...games].sort((a, b) => a.dateMs - b.dateMs);
  const byMode: Stats['byMode'] = { '1': emptyMode(), '3': emptyMode() };
  let totalSecondsPlayed = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  for (const g of sorted) {
    const m = byMode[String(g.drawCount) as '1' | '3'];
    m.played += 1;
    totalSecondsPlayed += g.durationSec;
    if (g.outcome === 'won') {
      m.won += 1;
      if (m.bestTimeSec === null || g.durationSec < m.bestTimeSec) m.bestTimeSec = g.durationSec;
      if (m.fewestMovesWin === null || g.moves < m.fewestMovesWin) m.fewestMovesWin = g.moves;
      if (g.score !== null && (m.bestScore === null || g.score > m.bestScore)) {
        m.bestScore = g.score;
      }
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }
  return { byMode, currentStreak, longestStreak, totalSecondsPlayed };
};

// A won game's score is a pure function of its (durationSec, moves, drawCount),
// so the persisted `score` is really just a cache of computeScore(). Recompute
// it for every won record; abandoned games stay null.
const rescoreGames = (games: GameRecord[]): GameRecord[] =>
  games.map((g) =>
    g.outcome === 'won'
      ? {
          ...g,
          score: computeScore({
            durationSec: g.durationSec,
            moves: g.moves,
            drawCount: g.drawCount,
          }),
        }
      : g,
  );

// Run on every hydration (not as a one-shot migration). Rescoring is idempotent
// and O(n) trivial arithmetic — sub-millisecond even for thousands of games —
// so doing it each load keeps history self-healing: any future change to the
// score formula propagates to past games automatically, with no version flag to
// bump. Aggregates (bestScore, etc.) are then re-derived from the rescored log,
// which is the authoritative event source the cached aggregates sit on top of.
//
// The loaded value is untrusted, so every record is validated first; anything
// malformed is dropped instead of crashing hydration or skewing the totals.
export const normalizeStats = (s: Stats): Stats => {
  const games = rescoreGames(
    Array.isArray(s.games)
      ? sanitizeGameRecords(s.games)
      : sanitizeGameRecords(migrateLegacyWins(s)).sort((a, b) => a.dateMs - b.dateMs),
  );
  return { schemaVersion: 1, games, ...recomputeAggregates(games) };
};

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
  mergeImported: (records: GameRecord[]) => { added: number; skipped: number };
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
    mergeImported: (records) => {
      const existing = useStatsStore.getState().stats.games;
      const keys = new Set(existing.map(dedupeKey));
      const fresh: GameRecord[] = [];
      let skipped = 0;
      for (const r of records) {
        const k = dedupeKey(r);
        if (keys.has(k)) {
          skipped += 1;
          continue;
        }
        keys.add(k);
        fresh.push(r);
      }
      const merged = [...existing, ...fresh].sort((a, b) => a.dateMs - b.dateMs);
      const aggs = recomputeAggregates(merged);
      set((state) => {
        state.stats = {
          schemaVersion: 1,
          games: merged,
          ...aggs,
        };
      });
      persist(useStatsStore.getState().stats);
      return { added: fresh.length, skipped };
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
