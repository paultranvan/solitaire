import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { makeCard, RANKS, type Rank, type Suit } from '@/game/card';
import { createInitialState } from '@/game/state';
import { blankGameState } from '@/test-utils/factories';
import { useStatsStore } from '@/store/statsStore';
import { Board } from '../Board';

// Board tests need a non-zero startedAt so the elapsed-time chip renders sanely.
const blank = (over: Parameters<typeof blankGameState>[0] = {}) =>
  blankGameState({ startedAt: Date.now(), ...over });

describe('Board', () => {
  it('renders the topbar, foundations, and tableau', () => {
    const initial = blank({ stock: [makeCard('h', 1)] });
    render(<Board initial={initial} />);
    expect(screen.getByLabelText(/draw/i)).toBeInTheDocument();
    // 4 foundation slots present (initially empty placeholders by aria-label)
    expect(screen.getByLabelText('foundation 0')).toBeInTheDocument();
    expect(screen.getByLabelText('foundation 1')).toBeInTheDocument();
    expect(screen.getByLabelText('foundation 2')).toBeInTheDocument();
    expect(screen.getByLabelText('foundation 3')).toBeInTheDocument();
  });

  it('clicking the stock dispatches a draw move and updates the talon', () => {
    const initial = blank({ stock: [makeCard('h', 1)] });
    render(<Board initial={initial} />);
    fireEvent.click(screen.getByLabelText(/draw/i));
    // The drawn card should now be visible as a face-up A of h on the talon
    expect(screen.getByLabelText(/A of h/i)).toBeInTheDocument();
  });

  it('clicking the stock when empty triggers recycle', () => {
    const initial = blank({
      stock: [],
      talon: [makeCard('h', 1, true)],
    });
    render(<Board initial={initial} />);
    fireEvent.click(screen.getByLabelText(/recycle/i));
    // After recycle, talon empty, stock has one face-down card.
    expect(screen.queryByLabelText(/A of h/i)).toBeNull();
  });

  describe('win duration', () => {
    afterEach(() => {
      vi.useRealTimers();
      useStatsStore.getState().reset();
    });

    it('records the live elapsed time when the player wins', () => {
      vi.useFakeTimers();
      vi.setSystemTime(0);

      const fullSuit = (suit: Suit) =>
        RANKS.map((r) => makeCard(suit, r as Rank, true));
      const heartsAceToQueen = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as Rank[]).map((r) =>
        makeCard('h', r, true),
      );

      // Three suits already on foundations, hearts up to Q on the 4th, K of
      // hearts sits alone on a tableau column. One auto-move click wins.
      const initial = blank({
        tableau: [[makeCard('h', 13, true)], [], [], [], [], [], []],
        foundations: [fullSuit('s'), fullSuit('c'), fullSuit('d'), heartsAceToQueen],
        startedAt: 0,
        activeMs: 0,
      });

      useStatsStore.getState().reset();
      render(<Board initial={initial} />);

      // 60 seconds of "wall clock" pass with no flush events (no tab switch,
      // no pagehide). state.activeMs stays 0; the running segment holds it all.
      vi.setSystemTime(60_000);

      fireEvent.click(screen.getByLabelText(/K of h/i));

      const m = useStatsStore.getState().stats.byMode['1'];
      expect(m.won).toBe(1);
      expect(m.bestTimeSec).toBe(60);
    });
  });

  describe('win screen actions', () => {
    afterEach(() => {
      vi.useRealTimers();
      useStatsStore.getState().reset();
    });

    // Build a won board (3 suits home, hearts up to Q, K of h on tableau) and
    // win it. The win sheet opens 600 ms later.
    const winAndOpenSheet = () => {
      const fullSuit = (suit: Suit) => RANKS.map((r) => makeCard(suit, r as Rank, true));
      const heartsAceToQueen = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as Rank[]).map((r) =>
        makeCard('h', r, true),
      );
      const initial = blank({
        tableau: [[makeCard('h', 13, true)], [], [], [], [], [], []],
        foundations: [fullSuit('s'), fullSuit('c'), fullSuit('d'), heartsAceToQueen],
      });
      render(<Board initial={initial} />);
      fireEvent.click(screen.getByLabelText(/K of h/i));
      act(() => vi.advanceTimersByTime(600));
    };

    it('offers New Game, Replay, and Close on the win screen', () => {
      vi.useFakeTimers();
      winAndOpenSheet();
      expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Replay' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('Replay re-deals the same seed', () => {
      vi.useFakeTimers();
      winAndOpenSheet();
      fireEvent.click(screen.getByRole('button', { name: 'Replay' }));

      // blankGameState seeds with 't'; a replay re-deals that exact hand.
      const rankLabel: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
      const expected = createInitialState({ drawCount: 1, seed: 't' });
      for (const column of expected.tableau) {
        const top = column[column.length - 1];
        const label = `${rankLabel[top.rank] ?? top.rank} of ${top.suit}`;
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      }
    });
  });
});
