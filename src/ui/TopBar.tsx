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
          onClick={onNewGame}
        >
          +
        </button>
        <button
          type="button"
          className="topbar__btn"
          title="undo"
          aria-label="undo"
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
          onClick={onHint}
        >
          💡
        </button>
        <button
          type="button"
          className="topbar__btn"
          title="menu"
          aria-label="menu"
          onClick={onMenu}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
