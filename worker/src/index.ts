// HTTP front for the shared leaderboard.
//
//   POST /v1/scores        submit a finished game; it is replayed and, if it is
//                          a genuine win, stored. Returns its score and rank.
//   POST /v1/past-scores   submit a few wins from before the leaderboard
//                          existed; they can't be replayed, so they are taken
//                          on plausibility and flagged in the database only.
//   GET  /v1/leaderboard   top scores for one draw mode (?draw=1|3&limit=N).
//
// All judgement about a submission lives in submission.ts; this file is
// routing, limits, CORS and SQL.
import {
  MAX_BODY_BYTES,
  parsePastWins,
  parseSubmission,
  verifySubmission,
  type RejectReason,
  type VerifiedScore,
} from './submission';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const LEADERBOARD_CACHE_SECONDS = 30;

type Json = Record<string, unknown>;

const allowedOrigins = (env: Env): Set<string> =>
  new Set(
    env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );

// CORS headers for this request. An origin outside the allow-list simply gets
// none, so browsers refuse to hand the response to that page. This is hygiene,
// not authentication: the API is public and holds no credentials.
const corsHeaders = (request: Request, env: Env): Record<string, string> => {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (origin !== null && allowedOrigins(env).has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
};

const json = (body: Json, status: number, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });

const errorResponse = (status: number, error: string): Response => json({ error }, status);

const clientKey = (request: Request): string =>
  request.headers.get('CF-Connecting-IP') ?? 'unknown';

// Reads the body as text, giving up as soon as it exceeds the cap — the
// Content-Length header is checked first but can't be trusted on its own.
const readBody = async (request: Request): Promise<string | null> => {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) return null;
  if (request.body === null) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

// Position of a score within its draw mode: 1 + the number of strictly better
// scores, so ties share a rank (same rule as the local leaderboard).
const rankOf = async (
  env: Env,
  drawCount: number,
  score: number,
): Promise<{ rank: number; total: number }> => {
  const [better, total] = await env.DB.batch<{ n: number }>([
    env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE draw_count = ?1 AND score > ?2').bind(
      drawCount,
      score,
    ),
    env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE draw_count = ?1').bind(drawCount),
  ]);
  return { rank: (better.results[0]?.n ?? 0) + 1, total: total.results[0]?.n ?? 0 };
};

const REJECT_STATUS: Record<RejectReason, number> = {
  'bad-request': 400,
  'bad-seed': 400,
  'bad-draw-count': 400,
  'bad-name': 400,
  'bad-duration': 400,
  'bad-moves': 400,
  'bad-entries': 400,
  // Well-formed, but not a result we accept.
  'illegal-move': 422,
  'not-won': 422,
  'too-fast': 422,
};

// The JSON body of a POST, or the error response to send instead.
const readJsonBody = async (
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> => {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return { ok: false, response: errorResponse(415, 'unsupported-media-type') };
  }
  const text = await readBody(request);
  if (text === null) return { ok: false, response: errorResponse(413, 'too-large') };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: errorResponse(400, 'bad-request') };
  }
};

const store = async (env: Env, entry: VerifiedScore): Promise<Response> => {
  // First verified submission for a deal wins; a repeat (a retry after a
  // dropped response, or the same deal replayed) is acknowledged with the
  // stored entry's standing rather than treated as an error. The one thing a
  // verified game does replace is an unverified entry for the same deal.
  const inserted = await env.DB.prepare(
    `INSERT INTO scores (draw_count, score, duration_sec, moves, name, seed, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT (seed, draw_count) DO UPDATE SET
       score = excluded.score,
       duration_sec = excluded.duration_sec,
       moves = excluded.moves,
       name = excluded.name,
       created_at = excluded.created_at,
       verified = 1,
       played_at = NULL
     WHERE scores.verified = 0
     RETURNING id`,
  )
    .bind(
      entry.drawCount,
      entry.score,
      entry.durationSec,
      entry.moves,
      entry.name,
      entry.seed,
      Date.now(),
    )
    .first<{ id: number }>();

  let score = entry.score;
  if (inserted === null) {
    const existing = await env.DB.prepare(
      'SELECT score FROM scores WHERE seed = ?1 AND draw_count = ?2',
    )
      .bind(entry.seed, entry.drawCount)
      .first<{ score: number }>();
    if (existing === null) return errorResponse(500, 'internal');
    score = existing.score;
  }
  const { rank, total } = await rankOf(env, entry.drawCount, score);
  return json({ accepted: inserted !== null, score, rank, total }, inserted !== null ? 201 : 200);
};

const submitScore = async (request: Request, env: Env): Promise<Response> => {
  const { success } = await env.SUBMIT_LIMITER.limit({ key: clientKey(request) });
  if (!success) return errorResponse(429, 'rate-limited');

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = parseSubmission(body.value);
  if (!parsed.ok) return errorResponse(REJECT_STATUS[parsed.reason], parsed.reason);
  const verified = verifySubmission(parsed.value);
  if (!verified.ok) return errorResponse(REJECT_STATUS[verified.reason], verified.reason);
  return store(env, verified.value);
};

// Past wins are taken on trust, so this door is narrower than the main one:
// its own tighter rate limit, a small batch, and a switch (PAST_SCORES) to
// shut it for good. An entry never displaces one already on the board.
const submitPastScores = async (request: Request, env: Env): Promise<Response> => {
  if (env.PAST_SCORES !== 'on') return errorResponse(403, 'past-scores-closed');
  const { success } = await env.PAST_LIMITER.limit({ key: clientKey(request) });
  if (!success) return errorResponse(429, 'rate-limited');

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const now = Date.now();
  const parsed = parsePastWins(body.value, now);
  if (!parsed.ok) return errorResponse(REJECT_STATUS[parsed.reason], parsed.reason);
  if (parsed.value.length === 0) return json({ accepted: 0 }, 200);

  const insert = env.DB.prepare(
    `INSERT INTO scores
       (draw_count, score, duration_sec, moves, name, seed, created_at, verified, played_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8)
     ON CONFLICT (seed, draw_count) DO NOTHING`,
  );
  const results = await env.DB.batch(
    parsed.value.map((e) =>
      insert.bind(e.drawCount, e.score, e.durationSec, e.moves, e.name, e.seed, now, e.playedAt),
    ),
  );
  const accepted = results.reduce((n, r) => n + (r.meta.changes ?? 0), 0);
  return json({ accepted }, 200);
};

type ScoreRow = {
  name: string;
  score: number;
  duration_sec: number;
  moves: number;
  date_ms: number;
};

const leaderboard = async (request: Request, env: Env, url: URL): Promise<Response> => {
  const { success } = await env.READ_LIMITER.limit({ key: clientKey(request) });
  if (!success) return errorResponse(429, 'rate-limited');

  const draw = url.searchParams.get('draw');
  if (draw !== '1' && draw !== '3') return errorResponse(400, 'bad-draw-count');
  const requested = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  if (!Number.isInteger(requested) || requested < 1) return errorResponse(400, 'bad-limit');
  const limit = Math.min(requested, MAX_LIMIT);

  const [rows, count] = await env.DB.batch<ScoreRow | { n: number }>([
    env.DB.prepare(
      `SELECT name, score, duration_sec, moves, COALESCE(played_at, created_at) AS date_ms
       FROM scores
       WHERE draw_count = ?1 ORDER BY score DESC, created_at ASC LIMIT ?2`,
    ).bind(Number(draw), limit),
    env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE draw_count = ?1').bind(Number(draw)),
  ]);

  // Competition ranking: equal scores share a rank, the next one skips ahead.
  let rank = 0;
  let previousScore: number | null = null;
  const entries = (rows.results as ScoreRow[]).map((row, index) => {
    if (row.score !== previousScore) rank = index + 1;
    previousScore = row.score;
    return {
      rank,
      name: row.name,
      score: row.score,
      durationSec: row.duration_sec,
      moves: row.moves,
      dateMs: row.date_ms,
    };
  });
  const total = (count.results[0] as { n: number } | undefined)?.n ?? 0;
  return json({ drawCount: Number(draw), total, entries }, 200, {
    'Cache-Control': `public, max-age=${LEADERBOARD_CACHE_SECONDS}`,
  });
};

const route = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (url.pathname === '/v1/scores') {
    return request.method === 'POST'
      ? submitScore(request, env)
      : errorResponse(405, 'method-not-allowed');
  }
  if (url.pathname === '/v1/past-scores') {
    return request.method === 'POST'
      ? submitPastScores(request, env)
      : errorResponse(405, 'method-not-allowed');
  }
  if (url.pathname === '/v1/leaderboard') {
    return request.method === 'GET'
      ? leaderboard(request, env, url)
      : errorResponse(405, 'method-not-allowed');
  }
  return errorResponse(404, 'not-found');
};

export default {
  async fetch(request, env): Promise<Response> {
    let response: Response;
    try {
      response = await route(request, env);
    } catch (err) {
      console.error('unhandled error', err);
      response = errorResponse(500, 'internal');
    }
    const withCors = new Response(response.body, response);
    for (const [name, value] of Object.entries(corsHeaders(request, env))) {
      withCors.headers.set(name, value);
    }
    return withCors;
  },
} satisfies ExportedHandler<Env>;
