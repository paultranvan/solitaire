import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type {
  PastWinsOutcome,
  ScoreSubmission,
  SubmitOutcome,
  WorldBoard,
} from '@/leaderboard/api';
import type { PastWin } from '@/leaderboard/pastWins';

vi.mock('@/leaderboard/config', () => ({ LEADERBOARD_URL: 'https://lb.test' }));

const submitScore = vi.fn<(s: ScoreSubmission) => Promise<SubmitOutcome>>();
const submitPastWins = vi.fn<(name: string, wins: PastWin[]) => Promise<PastWinsOutcome>>();
const fetchLeaderboard = vi.fn<(drawCount: 1 | 3) => Promise<WorldBoard | null>>();
vi.mock('@/leaderboard/api', () => ({
  submitScore: (s: ScoreSubmission) => submitScore(s),
  submitPastWins: (name: string, wins: PastWin[]) => submitPastWins(name, wins),
  fetchLeaderboard: (drawCount: 1 | 3) => fetchLeaderboard(drawCount),
}));

import { useLeaderboardStore } from '@/store/leaderboardStore';
import { defaultSettings, useSettingsStore } from '@/store/settingsStore';
import { defaultStats, useStatsStore, type GameRecord } from '@/store/statsStore';
import { RecordsPanel } from '../RecordsPanel';
import { WorldRank } from '../WorldRank';

const game = { seed: 'deal-1', drawCount: 1 as const, durationSec: 180, moves: [] };

// A win logged before the leaderboard existed.
const pastGame: GameRecord = {
  outcome: 'won',
  score: null,
  durationSec: 200,
  moves: 120,
  dateMs: Date.UTC(2026, 6, 1),
  drawCount: 1,
  seed: 'old-deal',
  redealCount: 0,
  hintsUsed: 0,
  undosUsed: 0,
};

const PAST_WINS_NOTICE = /best earlier scores are published too/;

beforeEach(() => {
  submitScore.mockReset();
  submitPastWins.mockReset();
  submitPastWins.mockResolvedValue('done');
  fetchLeaderboard.mockReset();
  useSettingsStore.setState({ settings: { ...defaultSettings(), language: 'en' } });
  useLeaderboardStore.setState({ current: null, queue: [], pastPending: null, pastDone: false });
  useStatsStore.setState({ stats: defaultStats() });
});

afterEach(cleanup);

describe('WorldRank', () => {
  it('renders nothing when there is no eligible win', () => {
    const { container } = render(<WorldRank />);
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts with a suggested, editable name and publishes on confirmation', async () => {
    submitScore.mockResolvedValue({
      kind: 'ranked',
      accepted: true,
      score: 1,
      rank: 12,
      total: 340,
    });
    useLeaderboardStore.setState({ current: { game, status: { kind: 'prompt' } } });
    render(<WorldRank />);

    const input = screen.getByLabelText('Display name') as HTMLInputElement;
    // A suggestion is pre-filled: two words from the generator.
    expect(input.value).toMatch(/^\p{L}+ \p{L}+$/u);

    fireEvent.change(input, { target: { value: 'Zoé la Brave' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(useSettingsStore.getState().settings).toMatchObject({
      leaderboard: 'on',
      playerName: 'Zoé la Brave',
    });
    expect(await screen.findByText('🌍 12th in the world, out of 340')).toBeInTheDocument();
    expect(submitScore).toHaveBeenCalledWith({ ...game, name: 'Zoé la Brave' });
    // No earlier wins in the log: nothing else is announced or sent.
    expect(submitPastWins).not.toHaveBeenCalled();
  });

  it('says so up front when publishing will also send earlier wins, then sends them', async () => {
    submitScore.mockResolvedValue({ kind: 'ranked', accepted: true, score: 1, rank: 1, total: 4 });
    // The log holds one earlier win plus the game just won (same deal as `game`).
    useStatsStore.setState({
      stats: { ...defaultStats(), games: [pastGame, { ...pastGame, seed: 'deal-1' }] },
    });
    useLeaderboardStore.setState({ current: { game, status: { kind: 'prompt' } } });
    render(<WorldRank />);

    expect(screen.getByText(PAST_WINS_NOTICE)).toBeInTheDocument();
    expect(submitPastWins).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await screen.findByText('🌍 1st in the world, out of 4');
    const name = useSettingsStore.getState().settings.playerName;
    expect(submitPastWins).toHaveBeenCalledWith(name, [
      { seed: 'old-deal', drawCount: 1, durationSec: 200, moves: 120, dateMs: pastGame.dateMs },
    ]);
  });

  it('does not mention earlier wins when the only win logged is the one on screen', () => {
    useStatsStore.setState({
      stats: { ...defaultStats(), games: [{ ...pastGame, seed: 'deal-1' }] },
    });
    useLeaderboardStore.setState({ current: { game, status: { kind: 'prompt' } } });
    render(<WorldRank />);
    expect(screen.queryByText(PAST_WINS_NOTICE)).not.toBeInTheDocument();
  });

  it('does not mention earlier wins once they have been sent', () => {
    useStatsStore.setState({ stats: { ...defaultStats(), games: [pastGame] } });
    useLeaderboardStore.setState({
      current: { game, status: { kind: 'prompt' } },
      pastDone: true,
    });
    render(<WorldRank />);
    expect(screen.queryByText(PAST_WINS_NOTICE)).not.toBeInTheDocument();
  });

  it('blocks publishing while the name is not acceptable', () => {
    useLeaderboardStore.setState({ current: { game, status: { kind: 'prompt' } } });
    render(<WorldRank />);
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '<b>' } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('2 to 20 letters');
    fireEvent.keyDown(screen.getByLabelText('Display name'), { key: 'Enter' });
    expect(submitScore).not.toHaveBeenCalled();
  });

  it('re-rolls the suggestion on demand', () => {
    useLeaderboardStore.setState({ current: { game, status: { kind: 'prompt' } } });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<WorldRank />);
    const input = screen.getByLabelText('Display name') as HTMLInputElement;
    expect(input.value).toBe('Swift Fox');
    random.mockReturnValue(0.99);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest another name' }));
    expect(input.value).toBe('Sly Crane');
    random.mockRestore();
  });

  it('declining opts out and removes the prompt without sending anything', () => {
    useLeaderboardStore.setState({ current: { game, status: { kind: 'prompt' } } });
    const { container } = render(<WorldRank />);
    fireEvent.click(screen.getByRole('button', { name: 'Don’t take part' }));
    expect(container).toBeEmptyDOMElement();
    expect(useSettingsStore.getState().settings.leaderboard).toBe('off');
    expect(submitScore).not.toHaveBeenCalled();
  });

  it.each([
    [{ kind: 'sending' }, 'Sending to the world leaderboard…'],
    [{ kind: 'queued' }, 'Offline — this score will be sent later.'],
    [{ kind: 'rejected' }, 'The leaderboard did not accept this score.'],
    [
      { kind: 'ranked', accepted: false, rank: 3, total: 9 },
      '🌍 This deal is already ranked: 3rd out of 9',
    ],
  ] as const)('shows the %j status', (status, text) => {
    useLeaderboardStore.setState({ current: { game, status } });
    render(<WorldRank />);
    expect(screen.getByRole('status')).toHaveTextContent(text);
  });
});

describe('RecordsPanel — world scope', () => {
  const entry = (rank: number, name: string, score: number) => ({
    rank,
    name,
    score,
    durationSec: 95,
    moves: 120,
    dateMs: new Date(2026, 10, 12).getTime(),
  });

  it('loads and lists the world top scores for the selected draw mode', async () => {
    fetchLeaderboard.mockResolvedValue({
      total: 340,
      entries: [entry(1, 'Zoé la Brave', 9000), entry(2, 'Swift Fox', 8000)],
    });
    useSettingsStore.getState().update({ playerName: 'Swift Fox' });
    render(<RecordsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'World' }));

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByText('Zoé la Brave')).toBeInTheDocument();
    expect(screen.getByText('340 ranked games')).toBeInTheDocument();
    expect(fetchLeaderboard).toHaveBeenLastCalledWith(1);
    // The player's own entry is marked.
    expect(screen.getByText('Swift Fox').closest('li')).toHaveClass('lbrow--me');

    fetchLeaderboard.mockResolvedValue({ total: 0, entries: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Draw 3' }));
    expect(await screen.findByText('No scores yet — be the first!')).toBeInTheDocument();
    expect(fetchLeaderboard).toHaveBeenLastCalledWith(3);
  });

  it('shows an error when the board cannot be loaded, and keeps local records reachable', async () => {
    fetchLeaderboard.mockResolvedValue(null);
    render(<RecordsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'World' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Leaderboard unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'My scores' }));
    expect(screen.getByText(/no wins yet/i)).toBeInTheDocument();
  });
});
