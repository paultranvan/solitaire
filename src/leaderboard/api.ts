// HTTP client for the leaderboard worker. Never throws: every failure is
// folded into a result the caller can act on (drop it, or keep it for later).
import type { Move } from '@/game/moves';
import { LEADERBOARD_URL } from './config';
import type { PastWin } from './pastWins';

export type ScoreSubmission = {
  seed: string;
  drawCount: 1 | 3;
  name: string;
  durationSec: number;
  moves: Move[];
};

export type SubmitOutcome =
  // Stored (accepted) or already on the board for this deal (not accepted);
  // either way `rank` / `total` describe where that deal stands.
  | { kind: 'ranked'; accepted: boolean; score: number; rank: number; total: number }
  // The server looked at it and said no. Retrying the same payload is pointless.
  | { kind: 'rejected'; reason: string }
  // Couldn't reach the server, or it was busy. Worth trying again later.
  | { kind: 'retry' };

export type WorldEntry = {
  rank: number;
  name: string;
  score: number;
  durationSec: number;
  moves: number;
  dateMs: number;
};

export type WorldBoard = { total: number; entries: WorldEntry[] };

// 'done' covers both "stored" and "refused for good": either way there is
// nothing to send again. 'retry' means the server couldn't be reached.
export type PastWinsOutcome = 'done' | 'retry';

const TIMEOUT_MS = 10_000;
// Upper bounds on what we'll render from a response — the server is ours, but
// a response is still input.
const MAX_ENTRIES = 100;
const MAX_NAME_LENGTH = 64;

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// fetch with a deadline, optionally tied to a caller's AbortSignal as well.
const request = async (
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response | null> => {
  if (signal?.aborted) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
};

// Drops a response body we are not going to read, so the request completes
// and its connection is released now rather than whenever the response object
// gets garbage-collected.
const discard = (response: Response): void => {
  void response.body?.cancel().catch(() => {});
};

const readJson = async (response: Response): Promise<Record<string, unknown> | null> => {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export const submitScore = async (
  submission: ScoreSubmission,
  baseUrl: string | null = LEADERBOARD_URL,
): Promise<SubmitOutcome> => {
  if (baseUrl === null) return { kind: 'rejected', reason: 'disabled' };
  const response = await request(`${baseUrl}/v1/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });
  if (response === null) return { kind: 'retry' };
  if (response.status === 429 || response.status >= 500) {
    discard(response);
    return { kind: 'retry' };
  }

  const body = await readJson(response);
  if (!response.ok) {
    const reason = typeof body?.error === 'string' ? body.error : `http-${response.status}`;
    return { kind: 'rejected', reason };
  }
  if (
    body === null ||
    typeof body.accepted !== 'boolean' ||
    !isCount(body.score) ||
    !isCount(body.rank) ||
    !isCount(body.total)
  ) {
    return { kind: 'rejected', reason: 'bad-response' };
  }
  return {
    kind: 'ranked',
    accepted: body.accepted,
    score: body.score,
    rank: body.rank,
    total: body.total,
  };
};

// Sends the player's best past wins (see ./pastWins) in a single request. The
// server stores the ones it finds plausible.
export const submitPastWins = async (
  name: string,
  entries: PastWin[],
  baseUrl: string | null = LEADERBOARD_URL,
): Promise<PastWinsOutcome> => {
  if (baseUrl === null) return 'done';
  const response = await request(`${baseUrl}/v1/past-scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, entries }),
  });
  if (response === null) return 'retry';
  discard(response);
  return response.status === 429 || response.status >= 500 ? 'retry' : 'done';
};

const parseEntry = (raw: unknown): WorldEntry | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const { rank, name, score, durationSec, moves, dateMs } = raw as Record<string, unknown>;
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  if (!isCount(rank) || !isCount(score) || !isCount(durationSec)) return null;
  if (!isCount(moves) || !isCount(dateMs)) return null;
  return { rank, name, score, durationSec, moves, dateMs };
};

// Top scores for one draw mode, or null if the board couldn't be loaded.
export const fetchLeaderboard = async (
  drawCount: 1 | 3,
  signal?: AbortSignal,
  baseUrl: string | null = LEADERBOARD_URL,
): Promise<WorldBoard | null> => {
  if (baseUrl === null) return null;
  const response = await request(
    `${baseUrl}/v1/leaderboard?draw=${drawCount}`,
    { method: 'GET' },
    signal,
  );
  if (response === null) return null;
  if (!response.ok) {
    discard(response);
    return null;
  }
  const body = await readJson(response);
  if (body === null || !Array.isArray(body.entries) || !isCount(body.total)) return null;
  const entries: WorldEntry[] = [];
  for (const raw of body.entries.slice(0, MAX_ENTRIES)) {
    const entry = parseEntry(raw);
    if (entry) entries.push(entry);
  }
  return { total: body.total, entries };
};
