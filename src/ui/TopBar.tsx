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
  onUndo: () => void;
  onHint: () => void;
  onNewGame: () => void;
  onMenu: () => void;
};

// Prevents the button from retaining focus after a mouse click, so Enter/Space
// don't accidentally re-trigger it later. Tab navigation still focuses normally.
const swallowFocus = (e: MouseEvent) => e.preventDefault();

export function TopBar({ elapsedSec, moves, canUndo, onUndo, onHint, onNewGame, onMenu }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__group topbar__group--left">
        <span className="topbar__chip" title="time">
          ⏱ {fmt(elapsedSec)}
        </span>
        <span className="topbar__chip" title="moves">
          ♠ {moves}
        </span>
      </div>
      <div className="topbar__group topbar__group--right">
        <button
          type="button"
          className="topbar__btn"
          title="new game"
          aria-label="new game"
          onMouseDown={swallowFocus}
          onClick={onNewGame}
        >
          +
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
          ↺
        </button>
        <button
          type="button"
          className="topbar__btn"
          title="hint"
          aria-label="hint"
          onMouseDown={swallowFocus}
          onClick={onHint}
        >
          💡
        </button>
        <button
          type="button"
          className="topbar__btn"
          title="menu"
          aria-label="menu"
          onMouseDown={swallowFocus}
          onClick={onMenu}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
