import { useEffect, useState, type MouseEvent } from 'react';
import { formatMMSS } from './format';
import './TopBar.css';

export type TopBarProps = {
  activeMs: number;
  // ms-epoch when the active-play clock started its current segment, or null
  // if paused (won, hidden, etc.). Displayed elapsed = activeMs + (now - runningSince).
  runningSince: number | null;
  moves: number;
  canUndo: boolean;
  onUndo: () => void;
  onHint: () => void;
  onMenu: () => void;
};

const elapsedSeconds = (activeMs: number, runningSince: number | null): number => {
  const live = runningSince !== null ? Date.now() - runningSince : 0;
  return Math.max(0, Math.floor((activeMs + live) / 1000));
};

// Self-contained 1Hz tick. Lives inside TopBar so the rest of the board
// doesn't re-render once a second just to update the time chip.
function ElapsedChip({
  activeMs,
  runningSince,
}: {
  activeMs: number;
  runningSince: number | null;
}) {
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(activeMs, runningSince));

  useEffect(() => {
    setElapsed(elapsedSeconds(activeMs, runningSince));
    if (runningSince === null) return;
    const id = setInterval(() => setElapsed(elapsedSeconds(activeMs, runningSince)), 1000);
    return () => clearInterval(id);
  }, [activeMs, runningSince]);

  return (
    <span className="topbar__chip" title="time">
      <span className="topbar__chip-glyph" aria-hidden="true">
        ⏱
      </span>
      {formatMMSS(elapsed)}
    </span>
  );
}

// Prevents the button from retaining focus after a mouse click, so Enter/Space
// don't accidentally re-trigger it later. Tab navigation still focuses normally.
const swallowFocus = (e: MouseEvent) => e.preventDefault();

export function TopBar({
  activeMs,
  runningSince,
  moves,
  canUndo,
  onUndo,
  onHint,
  onMenu,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__group topbar__group--left">
        <ElapsedChip activeMs={activeMs} runningSince={runningSince} />
        <span className="topbar__chip" title="moves">
          <span className="topbar__chip-glyph" aria-hidden="true">
            ♠
          </span>
          {moves}
        </span>
      </div>
      <div className="topbar__group topbar__group--right">
        <button
          type="button"
          className="topbar__btn"
          title="undo"
          aria-label="undo"
          onMouseDown={swallowFocus}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <svg
            className="topbar__icon"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H10" />
          </svg>
        </button>
        <button
          type="button"
          className="topbar__btn topbar__btn--hint"
          title="hint"
          aria-label="hint"
          onMouseDown={swallowFocus}
          onClick={onHint}
        >
          <span className="topbar__glyph topbar__glyph--hint">?</span>
        </button>
        <button
          type="button"
          className="topbar__btn"
          title="menu"
          aria-label="menu"
          onMouseDown={swallowFocus}
          onClick={onMenu}
        >
          <span className="topbar__glyph">☰</span>
        </button>
      </div>
    </header>
  );
}
