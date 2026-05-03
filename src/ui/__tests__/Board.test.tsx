import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { makeCard } from '@/game/card';
import { blankGameState } from '@/test-utils/factories';
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
});
