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

import { useLeaderboardStore, type WinStatus } from '@/store/leaderboardStore';
import { defaultSettings, useSettingsStore } from '@/store/settingsStore';
import { defaultStats, useStatsStore, type GameRecord } from '@/store/statsStore';
import { RecordsPanel } from '../RecordsPanel';
import { WinSheet } from '../WinSheet';
import { WorldRank } from '../WorldRank';
import { worldTier } from '../worldTier';

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

const setWorld = (status: WinStatus) => useLeaderboardStore.setState({ current: { game, status } });

const ranked = (rank: number, total = 340, accepted = true): SubmitOutcome => ({
  kind: 'ranked',
  accepted,
  score: 1,
  rank,
  total,
});

// The sheet as the board shows it after a win (confetti off unless asked).
const renderSheet = (showConfetti = false) =>
  render(
    <WinSheet
      open
      onClose={() => {}}
      onNewGame={() => {}}
      onReplay={() => {}}
      durationSec={180}
      moves={120}
      score={4321}
      ranking={null}
      showConfetti={showConfetti}
    />,
  );

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

describe('WinSheet — publish step', () => {
  it('goes straight to the results when there is nothing to ask', () => {
    renderSheet();
    expect(screen.getByText('Congratulations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
    expect(screen.queryByText('Join the world leaderboard?')).not.toBeInTheDocument();
  });

  it('opens on the publish question alone, with the score and a suggested name', () => {
    setWorld({ kind: 'prompt' });
    renderSheet();

    expect(screen.getByText('Join the world leaderboard?')).toBeInTheDocument();
    expect(screen.getByText('4,321')).toBeInTheDocument();
    // A suggestion is pre-filled: two words from the generator.
    const input = screen.getByLabelText('Display name') as HTMLInputElement;
    expect(input.value).toMatch(/^\p{L}+ \p{L}+$/u);
    // The results, and their way out, wait for the answer.
    expect(screen.queryByText('Congratulations')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Game' })).not.toBeInTheDocument();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it('publishing saves the name, sends the game and moves on to the results', async () => {
    submitScore.mockResolvedValue(ranked(12));
    setWorld({ kind: 'prompt' });
    renderSheet();

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Zoé la Brave' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish my score' }));

    expect(useSettingsStore.getState().settings).toMatchObject({
      leaderboard: 'on',
      playerName: 'Zoé la Brave',
    });
    expect(screen.queryByText('Join the world leaderboard?')).not.toBeInTheDocument();
    expect(screen.getByText('Congratulations')).toBeInTheDocument();
    expect(await screen.findByText('🌍 12th in the world, out of 340')).toBeInTheDocument();
    expect(submitScore).toHaveBeenCalledWith({ ...game, name: 'Zoé la Brave' });
    // No earlier wins in the log: nothing else is announced or sent.
    expect(submitPastWins).not.toHaveBeenCalled();
  });

  it('says so up front when publishing will also send earlier wins, then sends them', async () => {
    submitScore.mockResolvedValue(ranked(12, 40));
    // The log holds one earlier win plus the game just won (same deal as `game`).
    useStatsStore.setState({
      stats: { ...defaultStats(), games: [pastGame, { ...pastGame, seed: 'deal-1' }] },
    });
    setWorld({ kind: 'prompt' });
    renderSheet();

    expect(screen.getByText(PAST_WINS_NOTICE)).toBeInTheDocument();
    expect(submitPastWins).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Publish my score' }));
    await screen.findByText('🌍 12th in the world, out of 40');
    const name = useSettingsStore.getState().settings.playerName;
    expect(submitPastWins).toHaveBeenCalledWith(name, [
      { seed: 'old-deal', drawCount: 1, durationSec: 200, moves: 120, dateMs: pastGame.dateMs },
    ]);
  });

  it('does not mention earlier wins when the only win logged is the one on screen', () => {
    useStatsStore.setState({
      stats: { ...defaultStats(), games: [{ ...pastGame, seed: 'deal-1' }] },
    });
    setWorld({ kind: 'prompt' });
    renderSheet();
    expect(screen.queryByText(PAST_WINS_NOTICE)).not.toBeInTheDocument();
  });

  it('does not mention earlier wins once they have been sent', () => {
    useStatsStore.setState({ stats: { ...defaultStats(), games: [pastGame] } });
    useLeaderboardStore.setState({
      current: { game, status: { kind: 'prompt' } },
      pastDone: true,
    });
    renderSheet();
    expect(screen.queryByText(PAST_WINS_NOTICE)).not.toBeInTheDocument();
  });

  it('blocks publishing while the name is not acceptable', () => {
    setWorld({ kind: 'prompt' });
    renderSheet();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '<b>' } });
    expect(screen.getByRole('button', { name: 'Publish my score' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('2 to 20 letters');
    fireEvent.keyDown(screen.getByLabelText('Display name'), { key: 'Enter' });
    expect(submitScore).not.toHaveBeenCalled();
    expect(screen.getByText('Join the world leaderboard?')).toBeInTheDocument();
  });

  it('re-rolls the suggestion on demand', () => {
    setWorld({ kind: 'prompt' });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    renderSheet();
    const input = screen.getByLabelText('Display name') as HTMLInputElement;
    expect(input.value).toBe('Swift Fox');
    random.mockReturnValue(0.99);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest another name' }));
    expect(input.value).toBe('Sly Crane');
    random.mockRestore();
  });

  it('declining opts out, sends nothing, and moves on to the results', () => {
    setWorld({ kind: 'prompt' });
    renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Don’t take part' }));

    expect(useSettingsStore.getState().settings.leaderboard).toBe('off');
    expect(submitScore).not.toHaveBeenCalled();
    expect(screen.queryByText('Join the world leaderboard?')).not.toBeInTheDocument();
    expect(screen.getByText('Congratulations')).toBeInTheDocument();
    // Nothing about the world board in the results of someone who opted out.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('showers gold on top of the usual confetti for a world record only', () => {
    setWorld({ kind: 'ranked', accepted: true, rank: 1, total: 340 });
    const record = renderSheet(true);
    expect(record.container.querySelectorAll('.confetti')).toHaveLength(2);
    cleanup();

    setWorld({ kind: 'ranked', accepted: true, rank: 2, total: 340 });
    const second = renderSheet(true);
    expect(second.container.querySelectorAll('.confetti')).toHaveLength(1);
    cleanup();

    // Animations off: no confetti at all, record or not.
    setWorld({ kind: 'ranked', accepted: true, rank: 1, total: 340 });
    const quiet = renderSheet(false);
    expect(quiet.container.querySelectorAll('.confetti')).toHaveLength(0);
  });
});

describe('WorldRank', () => {
  it('renders nothing when there is no eligible win', () => {
    const { container } = render(<WorldRank />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the publish question is still open', () => {
    setWorld({ kind: 'prompt' });
    const { container } = render(<WorldRank />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [{ kind: 'sending' }, 'Sending to the world leaderboard…'],
    [{ kind: 'queued' }, 'Offline — this score will be sent later.'],
    [{ kind: 'rejected' }, 'The leaderboard did not accept this score.'],
    [{ kind: 'ranked', accepted: true, rank: 11, total: 340 }, '🌍 11th in the world, out of 340'],
    [
      { kind: 'ranked', accepted: false, rank: 3, total: 9 },
      '🌍 This deal is already ranked: 3rd out of 9',
    ],
  ] as const)('shows the %j status as a plain line', (status, text) => {
    setWorld(status);
    const { container } = render(<WorldRank />);
    expect(screen.getByRole('status')).toHaveTextContent(text);
    expect(container.querySelector('.wcel')).toBeNull();
  });

  it.each([
    [1, 'gold', 'World record!', 'The best score in the world, out of 340'],
    [2, 'silver', '2nd in the world!', 'out of 340 ranked games'],
    [3, 'bronze', '3rd in the world!', 'out of 340 ranked games'],
    [4, 'top10', 'World top 10!', '4th in the world, out of 340'],
    [10, 'top10', 'World top 10!', '10th in the world, out of 340'],
  ] as const)('celebrates world rank %i with the %s banner', (rank, tier, title, sub) => {
    setWorld({ kind: 'ranked', accepted: true, rank, total: 340 });
    render(<WorldRank />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveClass('wcel', `wcel--${tier}`);
    expect(banner).toHaveTextContent(title);
    expect(banner).toHaveTextContent(sub);
  });

  it('gives each podium place its own emblem and the top ten a star', () => {
    const emblem = (rank: number) => {
      cleanup();
      setWorld({ kind: 'ranked', accepted: true, rank, total: 340 });
      const { container } = render(<WorldRank />);
      return {
        rays: container.querySelector('.wcel__rays') !== null,
        ring: container.querySelector('.wcel__ring') !== null,
        numeral: container.querySelector('.wcel__art-num')?.textContent ?? null,
        sparkles: container.querySelectorAll('.wcel__spark').length,
      };
    };
    expect(emblem(1)).toEqual({ rays: true, ring: false, numeral: null, sparkles: 0 });
    expect(emblem(2)).toEqual({ rays: false, ring: false, numeral: '2', sparkles: 0 });
    expect(emblem(3)).toEqual({ rays: false, ring: false, numeral: '3', sparkles: 3 });
    expect(emblem(7)).toEqual({ rays: false, ring: true, numeral: null, sparkles: 3 });
  });

  it('does not celebrate a deal that was already on the board, whatever its rank', () => {
    setWorld({ kind: 'ranked', accepted: false, rank: 1, total: 340 });
    const { container } = render(<WorldRank />);
    expect(container.querySelector('.wcel')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('This deal is already ranked');
  });

  it('celebrates in French too', () => {
    useSettingsStore.getState().update({ language: 'fr' });
    setWorld({ kind: 'ranked', accepted: true, rank: 1, total: 340 });
    render(<WorldRank />);
    expect(screen.getByRole('status')).toHaveTextContent('Record du monde !');
    cleanup();
    setWorld({ kind: 'ranked', accepted: true, rank: 6, total: 340 });
    render(<WorldRank />);
    expect(screen.getByRole('status')).toHaveTextContent('Top 10 mondial !');
    expect(screen.getByRole('status')).toHaveTextContent('6e mondial sur 340');
  });
});

describe('worldTier', () => {
  it('maps the podium and the top ten, and nothing else', () => {
    expect([1, 2, 3, 4, 10, 11, 500].map(worldTier)).toEqual([
      'gold',
      'silver',
      'bronze',
      'top10',
      'top10',
      null,
      null,
    ]);
    expect([0, -1, 1.5, Number.NaN].map(worldTier)).toEqual([null, null, null, null]);
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
