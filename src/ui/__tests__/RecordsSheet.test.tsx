import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecordsSheet } from '../RecordsSheet';
import { defaultStats, useStatsStore, type WinRecord } from '@/store/statsStore';

const win = (score: number): WinRecord => ({
  score,
  durationSec: 200,
  moves: 150,
  dateMs: new Date(2026, 4, 9).getTime(),
});

afterEach(cleanup);

const seed = (mode: '1' | '3', scores: number[]) => {
  const stats = defaultStats();
  stats.byMode[mode].wins = scores.map(win);
  useStatsStore.setState({ stats });
};

describe('RecordsSheet', () => {
  it('shows the empty state when a mode has no wins', () => {
    seed('1', []);
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.getByText(/no wins yet/i)).toBeInTheDocument();
  });

  it('renders at most 10 rows, sorted by score descending', () => {
    seed('1', Array.from({ length: 12 }, (_, i) => (i + 1) * 100));
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.queryByText('200')).not.toBeInTheDocument();
  });

  it('switches mode when the Draw-3 tab is clicked', () => {
    const stats = defaultStats();
    stats.byMode['1'].wins = [win(500)];
    stats.byMode['3'].wins = [win(999)];
    useStatsStore.setState({ stats });
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.queryByText('999')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /draw 3/i }));
    expect(screen.getByText('999')).toBeInTheDocument();
  });
});
