import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLeaderboard, submitPastWins, submitScore, type ScoreSubmission } from '../api';

const BASE = 'https://lb.test';

const submission: ScoreSubmission = {
  seed: 'abc',
  drawCount: 1,
  name: 'Renard Agile',
  durationSec: 120,
  moves: [{ kind: 'draw' }],
};

const respond = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

const stubFetch = (impl: (...args: Parameters<typeof fetch>) => Promise<Response>) => {
  const mock = vi.fn(impl);
  vi.stubGlobal('fetch', mock);
  return mock;
};

afterEach(() => vi.unstubAllGlobals());

describe('submitScore', () => {
  it('posts the submission as JSON and returns the ranking', async () => {
    const fetchMock = stubFetch(async () =>
      respond(201, { accepted: true, score: 4200, rank: 3, total: 57 }),
    );
    const outcome = await submitScore(submission, BASE);
    expect(outcome).toEqual({ kind: 'ranked', accepted: true, score: 4200, rank: 3, total: 57 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://lb.test/v1/scores');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(submission);
  });

  it('reports a deal that was already on the board', async () => {
    stubFetch(async () => respond(200, { accepted: false, score: 900, rank: 12, total: 57 }));
    expect(await submitScore(submission, BASE)).toMatchObject({ kind: 'ranked', accepted: false });
  });

  it('asks for a retry when the server is unreachable, busy or failing', async () => {
    stubFetch(async () => {
      throw new TypeError('network down');
    });
    expect(await submitScore(submission, BASE)).toEqual({ kind: 'retry' });

    stubFetch(async () => respond(429, { error: 'rate-limited' }));
    expect(await submitScore(submission, BASE)).toEqual({ kind: 'retry' });

    stubFetch(async () => respond(503, 'unavailable'));
    expect(await submitScore(submission, BASE)).toEqual({ kind: 'retry' });
  });

  it('treats a refusal as final and surfaces the reason', async () => {
    stubFetch(async () => respond(422, { error: 'not-won' }));
    expect(await submitScore(submission, BASE)).toEqual({ kind: 'rejected', reason: 'not-won' });

    stubFetch(async () => respond(400, 'not json'));
    expect(await submitScore(submission, BASE)).toEqual({ kind: 'rejected', reason: 'http-400' });
  });

  it('rejects a success response that does not have the expected shape', async () => {
    stubFetch(async () => respond(201, { accepted: true, score: 'lots', rank: 1, total: 1 }));
    expect(await submitScore(submission, BASE)).toEqual({
      kind: 'rejected',
      reason: 'bad-response',
    });
  });

  it('never touches the network when the feature is not configured', async () => {
    const fetchMock = stubFetch(async () => respond(201, {}));
    expect(await submitScore(submission, null)).toEqual({ kind: 'rejected', reason: 'disabled' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('submitPastWins', () => {
  const wins = [
    {
      seed: 'old-deal',
      drawCount: 1 as const,
      durationSec: 200,
      moves: 120,
      dateMs: 1_780_000_000,
    },
  ];

  it('posts the name and the wins in one request', async () => {
    const fetchMock = stubFetch(async () => respond(200, { accepted: 1 }));
    expect(await submitPastWins('Renard Agile', wins, BASE)).toBe('done');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://lb.test/v1/past-scores');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Renard Agile', entries: wins });
  });

  it('asks for a retry when the server is unreachable, busy or failing', async () => {
    stubFetch(async () => {
      throw new TypeError('network down');
    });
    expect(await submitPastWins('Renard Agile', wins, BASE)).toBe('retry');

    stubFetch(async () => respond(429, { error: 'rate-limited' }));
    expect(await submitPastWins('Renard Agile', wins, BASE)).toBe('retry');

    stubFetch(async () => respond(500, 'boom'));
    expect(await submitPastWins('Renard Agile', wins, BASE)).toBe('retry');
  });

  it('treats a refusal as final', async () => {
    stubFetch(async () => respond(403, { error: 'past-scores-closed' }));
    expect(await submitPastWins('Renard Agile', wins, BASE)).toBe('done');

    stubFetch(async () => respond(400, { error: 'bad-entries' }));
    expect(await submitPastWins('Renard Agile', wins, BASE)).toBe('done');
  });

  it('never touches the network when the feature is not configured', async () => {
    const fetchMock = stubFetch(async () => respond(200, {}));
    expect(await submitPastWins('Renard Agile', wins, null)).toBe('done');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchLeaderboard', () => {
  const entry = (over: Record<string, unknown> = {}) => ({
    rank: 1,
    name: 'Zoé',
    score: 5000,
    durationSec: 90,
    moves: 110,
    dateMs: 1_700_000_000_000,
    ...over,
  });

  it('requests the draw mode and returns the entries', async () => {
    const fetchMock = stubFetch(async () => respond(200, { total: 2, entries: [entry()] }));
    const board = await fetchLeaderboard(3, undefined, BASE);
    expect(fetchMock.mock.calls[0][0]).toBe('https://lb.test/v1/leaderboard?draw=3');
    expect(board).toEqual({ total: 2, entries: [entry()] });
  });

  it('drops malformed entries and unknown fields', async () => {
    stubFetch(async () =>
      respond(200, {
        total: 3,
        entries: [
          { ...entry(), extra: '<script>' },
          entry({ name: 42 }),
          entry({ score: 'NaN' }),
          null,
        ],
      }),
    );
    const board = await fetchLeaderboard(1, undefined, BASE);
    expect(board).toEqual({ total: 3, entries: [entry()] });
  });

  it('returns null on failure, a bad payload, or when not configured', async () => {
    stubFetch(async () => respond(500, 'boom'));
    expect(await fetchLeaderboard(1, undefined, BASE)).toBeNull();

    stubFetch(async () => respond(200, { entries: 'nope' }));
    expect(await fetchLeaderboard(1, undefined, BASE)).toBeNull();

    stubFetch(async () => {
      throw new TypeError('offline');
    });
    expect(await fetchLeaderboard(1, undefined, BASE)).toBeNull();

    expect(await fetchLeaderboard(1, undefined, null)).toBeNull();
  });

  it('does not start a request for an already-aborted signal', async () => {
    const fetchMock = stubFetch(async () => respond(200, { total: 0, entries: [] }));
    const controller = new AbortController();
    controller.abort();
    expect(await fetchLeaderboard(1, controller.signal, BASE)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
