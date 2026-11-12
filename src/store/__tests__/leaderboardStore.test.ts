import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PastWinsOutcome, ScoreSubmission, SubmitOutcome } from '@/leaderboard/api';
import type { PastWin } from '@/leaderboard/pastWins';

vi.mock('@/leaderboard/config', () => ({ LEADERBOARD_URL: 'https://lb.test' }));

const submitScore = vi.fn<(s: ScoreSubmission) => Promise<SubmitOutcome>>();
const submitPastWins = vi.fn<(name: string, wins: PastWin[]) => Promise<PastWinsOutcome>>();
vi.mock('@/leaderboard/api', () => ({
  submitScore: (s: ScoreSubmission) => submitScore(s),
  submitPastWins: (name: string, wins: PastWin[]) => submitPastWins(name, wins),
}));

const saveKey = vi.fn(async () => {});
vi.mock('@/persistence/db', () => ({
  KEY_LEADERBOARD: 'leaderboard',
  KEY_SETTINGS: 'settings',
  KEY_STATS: 'stats',
  loadKey: vi.fn(async () => null),
  saveKey: (...args: unknown[]) => saveKey(...(args as [])),
}));

import { sanitizePastWins, sanitizeQueue, useLeaderboardStore } from '../leaderboardStore';
import { defaultSettings, useSettingsStore } from '../settingsStore';
import { defaultStats, useStatsStore, type GameRecord } from '../statsStore';

const game = (seed = 'deal-1') => ({
  seed,
  drawCount: 1 as const,
  durationSec: 180,
  moves: [{ kind: 'draw' as const }],
});

const ranked = (over: Partial<Extract<SubmitOutcome, { kind: 'ranked' }>> = {}): SubmitOutcome => ({
  kind: 'ranked',
  accepted: true,
  score: 3000,
  rank: 4,
  total: 80,
  ...over,
});

// Let the store's un-awaited send() settle.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const configure = (over: Partial<ReturnType<typeof defaultSettings>> = {}) =>
  useSettingsStore.setState({ settings: { ...defaultSettings(), ...over } });

// A win from the stats log, as it was recorded before the leaderboard existed.
const PLAYED = Date.UTC(2026, 6, 1);
const logged = (over: Partial<GameRecord> = {}): GameRecord => ({
  outcome: 'won',
  score: null,
  durationSec: 200,
  moves: 120,
  dateMs: PLAYED,
  drawCount: 1,
  seed: 'old-deal',
  redealCount: 0,
  hintsUsed: 0,
  undosUsed: 0,
  ...over,
});
const pastWin = (over: Partial<PastWin> = {}): PastWin => ({
  seed: 'old-deal',
  drawCount: 1,
  durationSec: 200,
  moves: 120,
  dateMs: PLAYED,
  ...over,
});
const logGames = (...games: GameRecord[]) =>
  useStatsStore.setState({ stats: { ...defaultStats(), games } });

beforeEach(() => {
  submitScore.mockReset();
  submitPastWins.mockReset();
  submitPastWins.mockResolvedValue('done');
  saveKey.mockClear();
  useLeaderboardStore.setState({ current: null, queue: [], pastPending: null, pastDone: false });
  logGames();
  configure();
});

afterEach(() => vi.clearAllMocks());

describe('offerWin', () => {
  it('asks first by default, and sends nothing until the player answers', () => {
    useLeaderboardStore.getState().offerWin(game());
    expect(useLeaderboardStore.getState().current?.status).toEqual({ kind: 'prompt' });
    expect(submitScore).not.toHaveBeenCalled();
  });

  it('sends straight away once the player has opted in with a name', async () => {
    configure({ leaderboard: 'on', playerName: 'Renard Agile' });
    submitScore.mockResolvedValue(ranked());
    useLeaderboardStore.getState().offerWin(game());
    expect(useLeaderboardStore.getState().current?.status).toEqual({ kind: 'sending' });
    await settle();
    expect(submitScore).toHaveBeenCalledWith({ ...game(), name: 'Renard Agile' });
    expect(useLeaderboardStore.getState().current?.status).toEqual({
      kind: 'ranked',
      accepted: true,
      rank: 4,
      total: 80,
    });
  });

  it('does nothing when the player opted out', () => {
    configure({ leaderboard: 'off', playerName: 'Renard Agile' });
    useLeaderboardStore.getState().offerWin(game());
    expect(useLeaderboardStore.getState().current).toBeNull();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it('ignores games that cannot be verified, and clears the previous win', () => {
    configure({ leaderboard: 'on', playerName: 'Renard Agile' });
    useLeaderboardStore.setState({ current: { game: game(), status: { kind: 'queued' } } });
    useLeaderboardStore.getState().offerWin({ ...game('deal-2'), moves: null });
    expect(useLeaderboardStore.getState().current).toBeNull();
    useLeaderboardStore.getState().offerWin(null);
    expect(useLeaderboardStore.getState().current).toBeNull();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it('falls back to the prompt when opted in but the saved name is unusable', () => {
    configure({ leaderboard: 'on', playerName: '' });
    useLeaderboardStore.getState().offerWin(game());
    expect(useLeaderboardStore.getState().current?.status).toEqual({ kind: 'prompt' });
  });
});

describe('answering the prompt', () => {
  it('publish() opts in, saves the normalized name and sends the pending win', async () => {
    submitScore.mockResolvedValue(ranked({ rank: 1, total: 1 }));
    useLeaderboardStore.getState().offerWin(game());
    expect(useLeaderboardStore.getState().publish('  Zoé   la Brave ')).toBe(true);
    await settle();
    expect(useSettingsStore.getState().settings).toMatchObject({
      leaderboard: 'on',
      playerName: 'Zoé la Brave',
    });
    expect(submitScore).toHaveBeenCalledWith({ ...game(), name: 'Zoé la Brave' });
    expect(useLeaderboardStore.getState().current?.status).toMatchObject({ kind: 'ranked' });
  });

  it('publish() refuses an unacceptable name and sends nothing', () => {
    useLeaderboardStore.getState().offerWin(game());
    expect(useLeaderboardStore.getState().publish('<b>')).toBe(false);
    expect(useSettingsStore.getState().settings.leaderboard).toBe('ask');
    expect(submitScore).not.toHaveBeenCalled();
  });

  it('decline() opts out and clears the win', () => {
    useLeaderboardStore.getState().offerWin(game());
    useLeaderboardStore.getState().decline();
    expect(useSettingsStore.getState().settings.leaderboard).toBe('off');
    expect(useLeaderboardStore.getState().current).toBeNull();
    expect(submitScore).not.toHaveBeenCalled();
  });
});

describe('delivery', () => {
  beforeEach(() => configure({ leaderboard: 'on', playerName: 'Renard Agile' }));

  it('queues (and persists) a submission that could not be delivered', async () => {
    submitScore.mockResolvedValue({ kind: 'retry' });
    useLeaderboardStore.getState().offerWin(game());
    await settle();
    const { current, queue } = useLeaderboardStore.getState();
    expect(current?.status).toEqual({ kind: 'queued' });
    expect(queue).toEqual([{ ...game(), name: 'Renard Agile' }]);
    expect(saveKey).toHaveBeenLastCalledWith('leaderboard', 1, {
      schemaVersion: 1,
      queue,
      pastPending: null,
      pastDone: true,
    });
  });

  it('drops a submission the server refused', async () => {
    submitScore.mockResolvedValue({ kind: 'rejected', reason: 'not-won' });
    useLeaderboardStore.getState().offerWin(game());
    await settle();
    expect(useLeaderboardStore.getState().current?.status).toEqual({ kind: 'rejected' });
    expect(useLeaderboardStore.getState().queue).toEqual([]);
  });

  it('does not let a late result overwrite a newer win', async () => {
    let finish!: (o: SubmitOutcome) => void;
    submitScore.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    useLeaderboardStore.getState().offerWin(game('deal-1'));
    // The player wins another deal before the first response arrives.
    submitScore.mockResolvedValueOnce(ranked({ rank: 9 }));
    useLeaderboardStore.getState().offerWin(game('deal-2'));
    await settle();
    finish(ranked({ rank: 1 }));
    await settle();
    const { current } = useLeaderboardStore.getState();
    expect(current?.game.seed).toBe('deal-2');
    expect(current?.status).toMatchObject({ kind: 'ranked', rank: 9 });
  });

  it('flushQueue() delivers oldest first and stops at the first failure', async () => {
    const a = { ...game('a'), name: 'Renard Agile' };
    const b = { ...game('b'), name: 'Renard Agile' };
    const c = { ...game('c'), name: 'Renard Agile' };
    useLeaderboardStore.setState({ queue: [a, b, c] });
    submitScore
      .mockResolvedValueOnce(ranked())
      .mockResolvedValueOnce({ kind: 'retry' })
      .mockResolvedValueOnce(ranked());
    await useLeaderboardStore.getState().flushQueue();
    expect(submitScore).toHaveBeenCalledTimes(2);
    expect(useLeaderboardStore.getState().queue).toEqual([b, c]);
  });

  it('flushQueue() updates the win on screen when its queued game gets through', async () => {
    submitScore.mockResolvedValueOnce({ kind: 'retry' });
    useLeaderboardStore.getState().offerWin(game());
    await settle();
    submitScore.mockResolvedValueOnce(ranked({ rank: 2, total: 10 }));
    await useLeaderboardStore.getState().flushQueue();
    expect(useLeaderboardStore.getState().queue).toEqual([]);
    expect(useLeaderboardStore.getState().current?.status).toMatchObject({
      kind: 'ranked',
      rank: 2,
    });
  });

  it('keeps at most 20 queued games, dropping the oldest', async () => {
    submitScore.mockResolvedValue({ kind: 'retry' });
    for (let i = 0; i < 23; i++) {
      useLeaderboardStore.getState().offerWin(game(`deal-${i}`));
      await settle();
    }
    const seeds = useLeaderboardStore.getState().queue.map((q) => q.seed);
    expect(seeds).toHaveLength(20);
    expect(seeds[0]).toBe('deal-3');
    expect(seeds[19]).toBe('deal-22');
  });
});

describe('past wins', () => {
  const state = () => useLeaderboardStore.getState();

  it('sends nothing while the player has not answered, or has declined', async () => {
    logGames(logged());
    state().offerWin(game());
    await state().flushQueue();
    expect(submitPastWins).not.toHaveBeenCalled();

    state().decline();
    state().offerWin(game('deal-2'));
    await state().flushQueue();
    expect(submitPastWins).not.toHaveBeenCalled();
    expect(state()).toMatchObject({ pastPending: null, pastDone: false });
  });

  it('publish() also sends the best past wins, leaving out the game just won', async () => {
    // The win on screen is already in the stats log when the prompt shows.
    logGames(logged(), logged({ seed: 'deal-1', durationSec: 180 }));
    submitScore.mockResolvedValue(ranked());
    state().offerWin(game('deal-1'));
    state().publish('Zoé la Brave');
    await settle();

    expect(submitPastWins).toHaveBeenCalledTimes(1);
    expect(submitPastWins).toHaveBeenCalledWith('Zoé la Brave', [pastWin()]);
    expect(state()).toMatchObject({ pastPending: null, pastDone: true });
    expect(saveKey).toHaveBeenLastCalledWith('leaderboard', 1, {
      schemaVersion: 1,
      queue: [],
      pastPending: null,
      pastDone: true,
    });
  });

  it('does it only once', async () => {
    configure({ leaderboard: 'on', playerName: 'Renard Agile' });
    logGames(logged());
    submitScore.mockResolvedValue(ranked());
    state().offerWin(game('deal-1'));
    await settle();
    state().offerWin(game('deal-2'));
    await settle();
    await state().flushQueue();
    expect(submitPastWins).toHaveBeenCalledTimes(1);
  });

  it('closes the matter without a request when there is nothing to send', async () => {
    configure({ leaderboard: 'on', playerName: 'Renard Agile' });
    submitScore.mockResolvedValue(ranked());
    state().offerWin(game());
    await settle();
    expect(submitPastWins).not.toHaveBeenCalled();
    expect(state().pastDone).toBe(true);
  });

  it('keeps the batch when the server is unreachable and retries it unchanged', async () => {
    configure({ leaderboard: 'on', playerName: 'Renard Agile' });
    logGames(logged());
    submitScore.mockResolvedValue(ranked());
    submitPastWins.mockResolvedValueOnce('retry');
    state().offerWin(game('deal-1'));
    await settle();
    expect(state()).toMatchObject({ pastPending: [pastWin()], pastDone: false });
    expect(saveKey).toHaveBeenLastCalledWith('leaderboard', 1, {
      schemaVersion: 1,
      queue: [],
      pastPending: [pastWin()],
      pastDone: false,
    });

    // A better game logged since must not change what was picked.
    logGames(logged(), logged({ seed: 'newer', durationSec: 60 }));
    await state().flushQueue();
    expect(submitPastWins).toHaveBeenCalledTimes(2);
    expect(submitPastWins).toHaveBeenLastCalledWith('Renard Agile', [pastWin()]);
    expect(state()).toMatchObject({ pastPending: null, pastDone: true });
  });

  it('does not try while the queue shows the server is unreachable', async () => {
    configure({ leaderboard: 'on', playerName: 'Renard Agile' });
    logGames(logged());
    useLeaderboardStore.setState({ queue: [{ ...game('queued'), name: 'Renard Agile' }] });
    submitScore.mockResolvedValue({ kind: 'retry' });
    await state().flushQueue();
    expect(submitPastWins).not.toHaveBeenCalled();
    expect(state().pastDone).toBe(false);
  });

  it('leaves out the deals waiting in the queue', async () => {
    configure({ leaderboard: 'on', playerName: 'Renard Agile' });
    logGames(logged({ seed: 'queued' }), logged());
    useLeaderboardStore.setState({ queue: [{ ...game('queued'), name: 'Renard Agile' }] });
    submitScore.mockResolvedValue(ranked());
    state().offerWin(game('deal-1'));
    await settle();
    expect(submitPastWins).toHaveBeenCalledWith('Renard Agile', [pastWin()]);
  });
});

describe('sanitizePastWins', () => {
  const NOW = Date.UTC(2026, 10, 12);

  it('starts from scratch on anything unreadable', () => {
    const notStarted = { pastPending: null, pastDone: false };
    expect(sanitizePastWins(null, NOW)).toEqual(notStarted);
    expect(sanitizePastWins({ queue: [] }, NOW)).toEqual(notStarted);
    expect(sanitizePastWins({ pastPending: 'nope', pastDone: 'yes' }, NOW)).toEqual(notStarted);
  });

  it('keeps a finished import finished', () => {
    expect(sanitizePastWins({ pastPending: [pastWin()], pastDone: true }, NOW)).toEqual({
      pastPending: null,
      pastDone: true,
    });
  });

  it('rebuilds a pending batch from validated entries', () => {
    const stored = {
      pastDone: false,
      pastPending: [{ ...pastWin(), extra: 1 }, pastWin({ moves: 3 }), null, 'x'],
    };
    expect(sanitizePastWins(stored, NOW)).toEqual({ pastPending: [pastWin()], pastDone: false });
  });
});

describe('sanitizeQueue', () => {
  const entry = { ...game(), name: 'Renard Agile' };

  it('keeps well-formed entries, rebuilt from known fields', () => {
    expect(sanitizeQueue({ queue: [{ ...entry, extra: 1 }] })).toEqual([entry]);
  });

  it('drops anything malformed', () => {
    const queue = [
      null,
      { ...entry, seed: '' },
      { ...entry, drawCount: 2 },
      { ...entry, name: '<script>' },
      { ...entry, durationSec: 1.5 },
      { ...entry, moves: [{ kind: 'teleport' }] },
      { ...entry, moves: [] },
    ];
    expect(sanitizeQueue({ queue })).toEqual([]);
    expect(sanitizeQueue(null)).toEqual([]);
    expect(sanitizeQueue({ queue: 'nope' })).toEqual([]);
  });
});
