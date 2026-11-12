// Past wins: games the player won before taking part in the shared
// leaderboard. The stats log kept the deal, the duration and the move count,
// but not the moves themselves, so the server cannot replay them the way it
// replays a fresh win. They are accepted on plausibility alone — a one-off
// meant for the handful of players the app had before the leaderboard — and
// only if they date from before PAST_CUTOFF_MS.
//
// Imported by both the app and the worker (worker/), so this file depends on
// nothing but the game engine: no `@/` alias, no DOM, no React.
import { computeScore } from '../game/score';
import { SEED_PATTERN } from './seed';

// How many past wins per draw mode the app offers — the player's own podium.
export const PAST_WINS_PER_MODE = 3;
// What the server takes in one request: both modes, with some headroom.
export const MAX_PAST_WINS = 10;

// Plausibility bounds. None of this proves a game was played; it only keeps
// the values inside what a real game can produce, which also caps the score
// an invented entry can claim.
export const MIN_PAST_DURATION_SEC = 30;
export const MAX_PAST_DURATION_SEC = 24 * 60 * 60;
export const MAX_PAST_MOVES = 2000;
// Just before the first release of this app; no record can be older.
export const PAST_EPOCH_MS = Date.UTC(2026, 4, 1);
// 1 December 2026: by then the leaderboard has shipped and every new win has a
// move log, so a win dated from this day on is never taken on trust.
export const PAST_CUTOFF_MS = Date.UTC(2026, 11, 1);
const CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

// Fewest moves any win can take: each of the 52 cards is moved to a foundation
// once, and the 24 stock cards have to be drawn first, `drawCount` at a time.
export const minWinMoves = (drawCount: 1 | 3): number => 52 + Math.ceil(24 / drawCount);

export type PastWin = {
  seed: string;
  drawCount: 1 | 3;
  durationSec: number;
  moves: number;
  dateMs: number;
};

const isIntBetween = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

// Validates an untrusted value as a PastWin and returns a fresh object holding
// only the known fields, or null if anything is missing or implausible. Used
// by the worker on what it receives and by the app on what it stored.
export const parsePastWin = (raw: unknown, nowMs: number): PastWin | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const { seed, drawCount, durationSec, moves, dateMs } = raw as Record<string, unknown>;
  if (typeof seed !== 'string' || !SEED_PATTERN.test(seed)) return null;
  if (drawCount !== 1 && drawCount !== 3) return null;
  if (!isIntBetween(durationSec, MIN_PAST_DURATION_SEC, MAX_PAST_DURATION_SEC)) return null;
  if (!isIntBetween(moves, minWinMoves(drawCount), MAX_PAST_MOVES)) return null;
  const latest = Math.min(nowMs + CLOCK_SKEW_MS, PAST_CUTOFF_MS - 1);
  if (!isIntBetween(dateMs, PAST_EPOCH_MS, latest)) return null;
  return { seed, drawCount, durationSec, moves, dateMs };
};

// The slice of a stats-log record this module reads (a GameRecord fits).
export type LoggedGame = {
  outcome: 'won' | 'abandoned';
  durationSec: number;
  moves: number;
  dateMs: number;
  drawCount: 1 | 3;
  seed: string;
};

type Deal = { seed: string; drawCount: 1 | 3 };

// A few records carry no usable seed (the very first stats format didn't keep
// it, and an imported backup can hold anything). Give those a stand-in that is
// stable for the record, so sending it twice still lands on the same entry.
const seedOf = (g: LoggedGame): string =>
  SEED_PATTERN.test(g.seed) ? g.seed : `past-${Math.floor(g.dateMs).toString(36)}-${g.moves}`;

// The player's best past wins — up to PAST_WINS_PER_MODE per draw mode, one
// per deal, highest score first — leaving out anything implausible or dated
// after the cutoff, and the deals in `skip` (games that are going to the
// leaderboard verified).
export const selectPastWins = (
  games: readonly LoggedGame[],
  skip: readonly Deal[] = [],
  nowMs: number = Date.now(),
): PastWin[] => {
  const out: PastWin[] = [];
  for (const drawCount of [1, 3] as const) {
    const candidates = games
      .filter((g) => g.outcome === 'won' && g.drawCount === drawCount)
      .map((g) =>
        parsePastWin(
          {
            seed: seedOf(g),
            drawCount,
            durationSec: Math.floor(g.durationSec),
            moves: g.moves,
            dateMs: Math.floor(g.dateMs),
          },
          nowMs,
        ),
      )
      .filter((w): w is PastWin => w !== null)
      .filter((w) => !skip.some((s) => s.seed === w.seed && s.drawCount === w.drawCount))
      .sort((a, b) => computeScore(b) - computeScore(a));
    const deals = new Set<string>();
    for (const win of candidates) {
      if (deals.has(win.seed)) continue;
      deals.add(win.seed);
      out.push(win);
      if (deals.size === PAST_WINS_PER_MODE) break;
    }
  }
  return out;
};
