import type { MouseEvent } from 'react';
import './TopBar.css';

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

export type TopBarProps = {
  elapsedSec: number;
  moves: number;
  canUndo: boolean;
  canRestart: boolean;
  onUndo: () => void;
  onHint: () => void;
  onNewGame: () => void;
  onRestart: () => void;
  onMenu: () => void;
};

// Prevents the button from retaining focus after a mouse click, so Enter/Space
// don't accidentally re-trigger it later. Tab navigation still focuses normally.
const swallowFocus = (e: MouseEvent) => e.preventDefault();

export function TopBar({
  elapsedSec,
  moves,
  canUndo,
  canRestart,
  onUndo,
  onHint,
  onNewGame,
  onRestart,
  onMenu,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__group topbar__group--left">
        <span className="topbar__chip" title="time">
          <span className="topbar__chip-glyph" aria-hidden="true">⏱</span>
          {fmt(elapsedSec)}
        </span>
        <span className="topbar__chip" title="moves">
          <span className="topbar__chip-glyph" aria-hidden="true">♠</span>
          {moves}
        </span>
      </div>
      <div className="topbar__group topbar__group--right">
        <button
          type="button"
          className="topbar__btn topbar__btn--labeled"
          title="new game"
          aria-label="new game"
          onMouseDown={swallowFocus}
          onClick={onNewGame}
        >
          <span className="topbar__glyph topbar__glyph--plus">+</span>
          <span className="topbar__btn-label">New Game</span>
        </button>
        <button
          type="button"
          className="topbar__btn topbar__btn--labeled"
          title="restart this deal"
          aria-label="restart this deal"
          onMouseDown={swallowFocus}
          onClick={onRestart}
          disabled={!canRestart}
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
            {/* Clockwise circular arrow — "play this deal again" */}
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          <span className="topbar__btn-label">Restart</span>
        </button>
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
