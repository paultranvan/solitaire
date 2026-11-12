// Pure validation + verification of a leaderboard submission. No I/O, so it is
// unit-tested by the app's vitest suite; index.ts wires it to HTTP and D1.
//
// Everything in a submission is attacker-controlled. The only values that end
// up stored are ones this module derived itself (score, move count) or
// validated against a strict shape (seed, name, duration).
import { parseMoveLog, replayGame } from '../../src/game/replay';
import { computeScore } from '../../src/game/score';
// The display-name, seed and past-win rules are shared with the app, which
// applies them before sending; these are the checks that actually count.
import { normalizeName } from '../../src/leaderboard/name';
import { MAX_PAST_WINS, parsePastWin } from '../../src/leaderboard/pastWins';
import { SEED_PATTERN } from '../../src/leaderboard/seed';
import type { Move } from '../../src/game/moves';

// Replay cost is linear in the log length; this keeps a worst-case request a
// few milliseconds of CPU. Real games run to a few hundred moves.
export const MAX_SUBMISSION_MOVES = 2000;
export const MAX_BODY_BYTES = 256 * 1024;
export const MAX_DURATION_SEC = 24 * 60 * 60;

// The duration is the one thing a replay can't verify — the client reports it.
// This floor only rejects the physically implausible: it is applied to the
// moves played before auto-complete became available, the part a human had to
// make by hand. It does not (and cannot) catch a solver played at human pace.
export const MIN_SECONDS_PER_MANUAL_MOVE = 0.25;

export type RejectReason =
  | 'bad-request'
  | 'bad-seed'
  | 'bad-draw-count'
  | 'bad-name'
  | 'bad-duration'
  | 'bad-moves'
  | 'bad-entries'
  | 'illegal-move'
  | 'not-won'
  | 'too-fast';

export type Submission = {
  seed: string;
  drawCount: 1 | 3;
  name: string;
  durationSec: number;
  moves: Move[];
};

export type VerifiedScore = {
  seed: string;
  drawCount: 1 | 3;
  name: string;
  durationSec: number;
  moves: number;
  score: number;
};

// A past win (see src/leaderboard/pastWins.ts): same columns, but nothing in
// it was replayed, and it carries the date the player says it was won.
export type UnverifiedScore = VerifiedScore & { playedAt: number };

type Result<T> = { ok: true; value: T } | { ok: false; reason: RejectReason };
const reject = (reason: RejectReason): { ok: false; reason: RejectReason } => ({
  ok: false,
  reason,
});

export const parseSubmission = (raw: unknown): Result<Submission> => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return reject('bad-request');
  const o = raw as Record<string, unknown>;

  if (typeof o.seed !== 'string' || !SEED_PATTERN.test(o.seed)) return reject('bad-seed');
  if (o.drawCount !== 1 && o.drawCount !== 3) return reject('bad-draw-count');

  const name = normalizeName(o.name);
  if (name === null) return reject('bad-name');

  const { durationSec } = o;
  if (
    typeof durationSec !== 'number' ||
    !Number.isInteger(durationSec) ||
    durationSec < 0 ||
    durationSec > MAX_DURATION_SEC
  ) {
    return reject('bad-duration');
  }

  const moves = parseMoveLog(o.moves, MAX_SUBMISSION_MOVES);
  if (moves === null || moves.length === 0) return reject('bad-moves');

  return { ok: true, value: { seed: o.seed, drawCount: o.drawCount, name, durationSec, moves } };
};

// Replays the game and, if it is a genuine win, returns the entry to store.
// The score is computed here — a score sent by the client is never read.
export const verifySubmission = (submission: Submission): Result<VerifiedScore> => {
  const { seed, drawCount, name, durationSec, moves } = submission;
  const replay = replayGame({ seed, drawCount, moves });
  if (!replay.ok) return reject(replay.reason);
  if (durationSec < replay.manualMoves * MIN_SECONDS_PER_MANUAL_MOVE) return reject('too-fast');
  return {
    ok: true,
    value: {
      seed,
      drawCount,
      name,
      durationSec,
      moves: replay.movesMade,
      score: computeScore({ durationSec, moves: replay.movesMade, drawCount }),
    },
  };
};

// A batch of past wins. There are no moves to replay, so all this can check
// is shape and plausibility; the score is still computed here. An entry that
// doesn't hold up is dropped on its own — one odd record shouldn't cost the
// player the rest — so the result may be an empty list.
export const parsePastWins = (raw: unknown, nowMs: number): Result<UnverifiedScore[]> => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return reject('bad-request');
  const o = raw as Record<string, unknown>;

  const name = normalizeName(o.name);
  if (name === null) return reject('bad-name');

  const { entries } = o;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_PAST_WINS) {
    return reject('bad-entries');
  }

  const deals = new Set<string>();
  const scores: UnverifiedScore[] = [];
  for (const rawEntry of entries) {
    const win = parsePastWin(rawEntry, nowMs);
    if (win === null) continue;
    const deal = `${win.drawCount}|${win.seed}`;
    if (deals.has(deal)) continue;
    deals.add(deal);
    scores.push({
      seed: win.seed,
      drawCount: win.drawCount,
      name,
      durationSec: win.durationSec,
      moves: win.moves,
      score: computeScore(win),
      playedAt: win.dateMs,
    });
  }
  return { ok: true, value: scores };
};
