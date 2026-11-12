import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useT } from '@/i18n/useT';
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

// Line icons, drawn on a 24-unit grid with currentColor strokes so they
// inherit the control's ink. Inline SVG (not font glyphs) so they render the
// same on every platform — the unicode ⏱ / ☰ they replace picked up whatever
// emoji or symbol font the OS had.
function Icon({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// Self-contained 1Hz tick. Lives inside TopBar so the rest of the board
// doesn't re-render once a second just to update the time readout.
function ElapsedStat({
  activeMs,
  runningSince,
}: {
  activeMs: number;
  runningSince: number | null;
}) {
  const { t } = useT();
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(activeMs, runningSince));

  useEffect(() => {
    setElapsed(elapsedSeconds(activeMs, runningSince));
    if (runningSince === null) return;
    const id = setInterval(() => setElapsed(elapsedSeconds(activeMs, runningSince)), 1000);
    return () => clearInterval(id);
  }, [activeMs, runningSince]);

  return (
    <span className="topbar__stat" title={t('topbar.time')}>
      <Icon className="topbar__stat-icon">
        <circle cx="12" cy="13.5" r="7.5" />
        <path d="M12 9.5v4l2.5 2" />
        <path d="M9.5 3h5" />
      </Icon>
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
  const { t } = useT();
  return (
    <header className="topbar">
      {/* The inner row is capped to the board's width, so on a wide screen the
          readouts and buttons line up with the card columns instead of
          drifting out to the window corners. */}
      <div className="topbar__inner">
        <div className="topbar__stats">
          <ElapsedStat activeMs={activeMs} runningSince={runningSince} />
          <span className="topbar__stat" title={t('topbar.moves')}>
            <Icon className="topbar__stat-icon">
              <path d="M4 8.5h14" />
              <path d="m15 5 3.5 3.5L15 12" />
              <path d="M20 15.5H6" />
              <path d="m9 12-3.5 3.5L9 19" />
            </Icon>
            {moves}
          </span>
        </div>
        <div className="topbar__actions">
          <button
            type="button"
            className="topbar__btn"
            title={t('topbar.undo')}
            aria-label={t('topbar.undo')}
            onMouseDown={swallowFocus}
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Icon className="topbar__icon">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H10" />
            </Icon>
          </button>
          <button
            type="button"
            className="topbar__btn topbar__btn--hint"
            title={t('topbar.hint')}
            aria-label={t('topbar.hint')}
            onMouseDown={swallowFocus}
            onClick={onHint}
          >
            <Icon className="topbar__icon">
              <path d="M12 3a6 6 0 0 0-3.7 10.7c.6.5 1 1.2 1.1 1.9h5.2c.1-.7.5-1.4 1.1-1.9A6 6 0 0 0 12 3Z" />
              <path d="M9.8 18.5h4.4" />
              <path d="M10.6 21h2.8" />
            </Icon>
          </button>
          <button
            type="button"
            className="topbar__btn"
            title={t('topbar.menu')}
            aria-label={t('topbar.menu')}
            onMouseDown={swallowFocus}
            onClick={onMenu}
          >
            <Icon className="topbar__icon">
              <path d="M4.5 7h15" />
              <path d="M4.5 12h15" />
              <path d="M4.5 17h15" />
            </Icon>
          </button>
        </div>
      </div>
    </header>
  );
}
