import './TopBar.css';

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

export function TopBar({
  elapsedSec,
  moves,
}: {
  elapsedSec: number;
  moves: number;
}) {
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
        <button className="topbar__btn" title="undo" aria-label="undo" disabled>
          ↺
        </button>
        <button className="topbar__btn" title="hint" aria-label="hint" disabled>
          💡
        </button>
        <button className="topbar__btn" title="menu" aria-label="menu" disabled>
          ☰
        </button>
      </div>
    </header>
  );
}
