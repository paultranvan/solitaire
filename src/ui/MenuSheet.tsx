import { useState } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { useSettingsStore, Settings } from '@/store/settingsStore';
import { Sheet } from './Sheet';
import './MenuSheet.css';

const fmtTime = (sec: number | null): string => {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const fmtDuration = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const winPct = (won: number, played: number): string =>
  played === 0 ? '—' : `${Math.round((won / played) * 100)}%`;

function StatsSection() {
  const stats = useStatsStore((s) => s.stats);
  const reset = useStatsStore((s) => s.reset);
  const [confirming, setConfirming] = useState(false);

  const totalWon = stats.byMode['1'].won + stats.byMode['3'].won;
  const totalPlayed = stats.byMode['1'].played + stats.byMode['3'].played;

  return (
    <section className="menu-section">
      <h3 className="menu-section__title">Statistics</h3>

      <div className="stats-grid">
        <div className="stat-tile">
          <div className="stat-tile__value">{totalWon}</div>
          <div className="stat-tile__label">Wins</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{winPct(totalWon, totalPlayed)}</div>
          <div className="stat-tile__label">Win %</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{stats.currentStreak}</div>
          <div className="stat-tile__label">Streak</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{stats.longestStreak}</div>
          <div className="stat-tile__label">Best streak</div>
        </div>
      </div>

      <div className="mode-table">
        <div className="mode-row mode-row--head">
          <div></div>
          <div>Played</div>
          <div>Won</div>
          <div>Win %</div>
          <div>Best</div>
          <div>Min moves</div>
        </div>
        {(['1', '3'] as const).map((m) => {
          const ms = stats.byMode[m];
          return (
            <div key={m} className="mode-row">
              <div className="mode-row__label">Draw {m}</div>
              <div>{ms.played}</div>
              <div>{ms.won}</div>
              <div>{winPct(ms.won, ms.played)}</div>
              <div>{fmtTime(ms.bestTimeSec)}</div>
              <div>{ms.fewestMovesWin ?? '—'}</div>
            </div>
          );
        })}
      </div>

      <div className="menu-row menu-row--quiet">
        <span>Total time played</span>
        <span>{fmtDuration(stats.totalSecondsPlayed)}</span>
      </div>

      {confirming ? (
        <div className="confirm-row">
          <span>Reset all stats?</span>
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
        <button
          type="button"
          className="btn btn--ghost menu-section__action"
          onClick={() => setConfirming(true)}
        >
          Reset stats…
        </button>
      )}
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
    <section className="menu-section">
      <h3 className="menu-section__title">Settings</h3>

      <div className="menu-row">
        <span>Draw count (next game)</span>
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

      <div className="menu-row">
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

      <Toggle
        label="Sound effects"
        value={settings.sound}
        onChange={(v) => set({ sound: v })}
      />
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
        label="Auto-move on double-tap"
        value={settings.autoMoveOnDoubleTap}
        onChange={(v) => set({ autoMoveOnDoubleTap: v })}
      />
    </section>
  );
}

export function MenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Menu">
      <StatsSection />
      <SettingsSection />
    </Sheet>
  );
}
