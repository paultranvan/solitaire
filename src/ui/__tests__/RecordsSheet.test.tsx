import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecordsSheet } from '../RecordsSheet';
import { defaultStats, useStatsStore, type GameRecord } from '@/store/statsStore';

const won = (score: number, drawCount: 1 | 3 = 1): GameRecord => ({
  outcome: 'won',
  score,
  durationSec: 200,
  moves: 150,
  dateMs: new Date(2026, 4, 9).getTime(),
  drawCount,
  seed: '',
  redealCount: 0,
  hintsUsed: 0,
  undosUsed: 0,
});

afterEach(cleanup);

const seed = (drawCount: 1 | 3, scores: number[]) => {
  const stats = defaultStats();
  stats.games = scores.map((s) => won(s, drawCount));
  useStatsStore.setState({ stats });
};

describe('RecordsSheet', () => {
  it('shows the empty state when a mode has no wins', () => {
    seed(1, []);
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.getByText(/no wins yet/i)).toBeInTheDocument();
  });

  it('renders at most 10 rows, sorted by score descending', () => {
    seed(1, Array.from({ length: 12 }, (_, i) => (i + 1) * 100));
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.queryByText('200')).not.toBeInTheDocument();
  });

  it('shows the best score / time / moves summary for the active mode', () => {
    const stats = defaultStats();
    stats.byMode['1'].bestScore = 8420;
    stats.byMode['1'].bestTimeSec = 192;
    stats.byMode['1'].fewestMovesWin = 142;
    useStatsStore.setState({ stats });
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.getByText('8,420')).toBeInTheDocument();
    expect(screen.getByText('03:12')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('switches mode when the Draw-3 tab is clicked', () => {
    const stats = defaultStats();
    stats.games = [won(500, 1), won(999, 3)];
    useStatsStore.setState({ stats });
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.queryByText('999')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /draw 3/i }));
    expect(screen.getByText('999')).toBeInTheDocument();
  });
});
