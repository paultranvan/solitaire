import { useState } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { useSettingsStore, Settings } from '@/store/settingsStore';
import { Sheet } from './Sheet';
import { formatBestTime, formatDuration } from './format';
import './MenuSheet.css';

const winPct = (won: number, played: number): string =>
  played === 0 ? '—' : `${Math.round((won / played) * 100)}%`;

function StatHero({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat-hero">
      <div className="stat-hero__value">{value}</div>
      <div className="stat-hero__label">{label}</div>
    </div>
  );
}

function ModeBlock({
  mode,
  played,
  won,
  bestTimeSec,
  fewestMovesWin,
  bestScore,
}: {
  mode: '1' | '3';
  played: number;
  won: number;
  bestTimeSec: number | null;
  fewestMovesWin: number | null;
  bestScore: number | null;
}) {
  return (
    <div className="mode-block">
      <div className="mode-block__head">
        <span className="mode-block__name">Draw {mode}</span>
        <span className="mode-block__rate">{winPct(won, played)}</span>
      </div>
      <dl className="mode-block__list">
        <div className="mode-block__item">
          <dt>Played</dt>
          <dd>{played}</dd>
        </div>
        <div className="mode-block__item">
          <dt>Won</dt>
          <dd>{won}</dd>
        </div>
        <div className="mode-block__item">
          <dt>Best score</dt>
          <dd>{bestScore === null ? '—' : bestScore.toLocaleString()}</dd>
        </div>
        <div className="mode-block__item">
          <dt>Best time</dt>
          <dd>{formatBestTime(bestTimeSec)}</dd>
        </div>
        <div className="mode-block__item">
          <dt>Min moves</dt>
          <dd>{fewestMovesWin ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function StatsSection() {
  const stats = useStatsStore((s) => s.stats);
  const reset = useStatsStore((s) => s.reset);
  const [confirming, setConfirming] = useState(false);

  const totalWon = stats.byMode['1'].won + stats.byMode['3'].won;
  const totalPlayed = stats.byMode['1'].played + stats.byMode['3'].played;

  return (
    <section className="m-section">
      <h3 className="m-eyebrow">
        <span className="m-eyebrow__line" />
        Statistics
        <span className="m-eyebrow__line" />
      </h3>

      <div className="stat-hero-grid">
        <StatHero value={totalWon} label="Wins" />
        <StatHero value={winPct(totalWon, totalPlayed)} label="Win rate" />
        <StatHero value={stats.currentStreak} label="Streak" />
        <StatHero value={stats.longestStreak} label="Best" />
      </div>

      <div className="mode-pair">
        {(['1', '3'] as const).map((m) => (
          <ModeBlock
            key={m}
            mode={m}
            played={stats.byMode[m].played}
            won={stats.byMode[m].won}
            bestTimeSec={stats.byMode[m].bestTimeSec}
            fewestMovesWin={stats.byMode[m].fewestMovesWin}
            bestScore={stats.byMode[m].bestScore}
          />
        ))}
      </div>

      <div className="m-row m-row--quiet">
        <span>Total time at table</span>
        <span className="num">{formatDuration(stats.totalSecondsPlayed)}</span>
      </div>

      <div className="m-section__action">
        {confirming ? (
          <div className="confirm-row">
            <span>Reset all statistics?</span>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                reset();
                setConfirming(false);
              }}
            >
              Yes, reset
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>
            Reset stats…
          </button>
        )}
      </div>
    </section>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span className="toggle__label">{label}</span>
      <span className={`toggle__switch${value ? ' is-on' : ''}`} aria-hidden>
        <span className="toggle__thumb" />
      </span>
      <input
        type="checkbox"
        className="toggle__input"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function SettingsSection() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const set = (patch: Partial<Settings>) => update(patch);

  return (
    <section className="m-section">
      <h3 className="m-eyebrow">
        <span className="m-eyebrow__line" />
        Settings
        <span className="m-eyebrow__line" />
      </h3>

      <div className="m-row">
        <span>
          Draw count<span className="m-row__hint">next game</span>
        </span>
        <div className="seg">
          <button
            type="button"
            className={`seg__btn${settings.drawCount === 1 ? ' is-active' : ''}`}
            onClick={() => set({ drawCount: 1 })}
          >
            1
          </button>
          <button
            type="button"
            className={`seg__btn${settings.drawCount === 3 ? ' is-active' : ''}`}
            onClick={() => set({ drawCount: 3 })}
          >
            3
          </button>
        </div>
      </div>

      <div className="m-row">
        <span>Layout</span>
        <div className="seg">
          <button
            type="button"
            className={`seg__btn${settings.handedness === 'right' ? ' is-active' : ''}`}
            onClick={() => set({ handedness: 'right' })}
            title="Stock on the left, foundations on the right"
          >
            Right-handed
          </button>
          <button
            type="button"
            className={`seg__btn${settings.handedness === 'left' ? ' is-active' : ''}`}
            onClick={() => set({ handedness: 'left' })}
            title="Stock on the right, foundations on the left"
          >
            Left-handed
          </button>
        </div>
      </div>

      <Toggle label="Sound effects" value={settings.sound} onChange={(v) => set({ sound: v })} />
      <Toggle
        label="Haptic feedback"
        value={settings.haptics}
        onChange={(v) => set({ haptics: v })}
      />
      <Toggle
        label="Animations"
        value={settings.animations}
        onChange={(v) => set({ animations: v })}
      />
      <Toggle
        label="Auto-move on tap"
        value={settings.autoMoveOnTap}
        onChange={(v) => set({ autoMoveOnTap: v })}
      />
      <Toggle
        label="Solvable deals only"
        value={settings.requireWinnable}
        onChange={(v) => set({ requireWinnable: v })}
      />
    </section>
  );
}

function GameActions({
  onNewGame,
  onRestart,
  canRestart,
}: {
  onNewGame: () => void;
  onRestart: () => void;
  canRestart: boolean;
}) {
  return (
    <div className="m-game-actions">
      <button
        type="button"
        className="m-game-action m-game-action--accent"
        onClick={onNewGame}
      >
        <span className="m-game-action__glyph" aria-hidden="true">
          +
        </span>
        <span className="m-game-action__label">New Game</span>
      </button>
      <button
        type="button"
        className="m-game-action"
        onClick={onRestart}
        disabled={!canRestart}
      >
        <svg
          className="m-game-action__icon"
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
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        <span className="m-game-action__label">Restart</span>
      </button>
    </div>
  );
}

export function MenuSheet({
  open,
  onClose,
  onNewGame,
  onRestart,
  canRestart,
}: {
  open: boolean;
  onClose: () => void;
  onNewGame: () => void;
  onRestart: () => void;
  canRestart: boolean;
}) {
  // Close the sheet after a game-changing action so the player sees the new
  // board immediately. Defer one tick so the click finishes before the sheet
  // begins its exit animation.
  const fire = (handler: () => void) => () => {
    handler();
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Menu">
      <GameActions
        onNewGame={fire(onNewGame)}
        onRestart={fire(onRestart)}
        canRestart={canRestart}
      />
      <StatsSection />
      <SettingsSection />
    </Sheet>
  );
}
