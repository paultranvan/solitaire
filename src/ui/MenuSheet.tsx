import { useState } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { useSettingsStore, Settings } from '@/store/settingsStore';
import { useT, Translator } from '@/i18n/useT';
import { Sheet } from './Sheet';
import { RecordsPanel } from './RecordsPanel';
import './MenuSheet.css';

const winPct = (won: number, played: number, tr: Translator): string =>
  played === 0 ? '—' : `${tr.formatNumber(Math.round((won / played) * 100))}%`;

function StatHero({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat-hero">
      <div className="stat-hero__value">{value}</div>
      <div className="stat-hero__label">{label}</div>
    </div>
  );
}

function StatsSection() {
  const stats = useStatsStore((s) => s.stats);
  const reset = useStatsStore((s) => s.reset);
  const [confirming, setConfirming] = useState(false);
  const tr = useT();
  const { t, formatNumber, formatDuration } = tr;

  const totalWon = stats.byMode['1'].won + stats.byMode['3'].won;
  const totalPlayed = stats.byMode['1'].played + stats.byMode['3'].played;

  return (
    <section className="m-section">
      <h3 className="m-eyebrow">
        <span className="m-eyebrow__line" />
        {t('stats.title')}
        <span className="m-eyebrow__line" />
      </h3>

      <div className="stat-hero-grid">
        <StatHero value={formatNumber(totalWon)} label={t('stats.wins')} />
        <StatHero value={winPct(totalWon, totalPlayed, tr)} label={t('stats.winRate')} />
        <StatHero value={formatNumber(stats.currentStreak)} label={t('stats.streak')} />
        <StatHero value={formatNumber(stats.longestStreak)} label={t('stats.best')} />
      </div>

      <RecordsPanel />

      <div className="m-row m-row--quiet">
        <span>{t('stats.totalTime')}</span>
        <span className="num">{formatDuration(stats.totalSecondsPlayed)}</span>
      </div>

      <div className="m-section__action">
        {confirming ? (
          <div className="confirm-row">
            <span>{t('stats.resetPrompt')}</span>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                reset();
                setConfirming(false);
              }}
            >
              {t('stats.resetYes')}
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              {t('stats.resetNo')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>
            {t('stats.resetButton')}
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
  const { t } = useT();

  const set = (patch: Partial<Settings>) => update(patch);

  return (
    <section className="m-section">
      <h3 className="m-eyebrow">
        <span className="m-eyebrow__line" />
        {t('settings.title')}
        <span className="m-eyebrow__line" />
      </h3>

      <div className="m-row">
        <span>
          {t('settings.drawCount')}
          <span className="m-row__hint">{t('settings.drawCountHint')}</span>
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
        <span>{t('settings.layout')}</span>
        <div className="seg">
          <button
            type="button"
            className={`seg__btn${settings.handedness === 'right' ? ' is-active' : ''}`}
            onClick={() => set({ handedness: 'right' })}
            title={t('settings.rightHandedTitle')}
          >
            {t('settings.rightHanded')}
          </button>
          <button
            type="button"
            className={`seg__btn${settings.handedness === 'left' ? ' is-active' : ''}`}
            onClick={() => set({ handedness: 'left' })}
            title={t('settings.leftHandedTitle')}
          >
            {t('settings.leftHanded')}
          </button>
        </div>
      </div>

      <div className="m-row">
        <span>{t('settings.language')}</span>
        <div className="seg">
          <button
            type="button"
            className={`seg__btn${settings.language === 'en' ? ' is-active' : ''}`}
            onClick={() => set({ language: 'en' })}
          >
            English
          </button>
          <button
            type="button"
            className={`seg__btn${settings.language === 'fr' ? ' is-active' : ''}`}
            onClick={() => set({ language: 'fr' })}
          >
            Français
          </button>
        </div>
      </div>

      <Toggle
        label={t('settings.sound')}
        value={settings.sound}
        onChange={(v) => set({ sound: v })}
      />
      <Toggle
        label={t('settings.haptics')}
        value={settings.haptics}
        onChange={(v) => set({ haptics: v })}
      />
      <Toggle
        label={t('settings.animations')}
        value={settings.animations}
        onChange={(v) => set({ animations: v })}
      />
      <Toggle
        label={t('settings.requireWinnable')}
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
  const { t } = useT();
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
        <span className="m-game-action__label">{t('menu.newGame')}</span>
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
        <span className="m-game-action__label">{t('menu.restart')}</span>
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
  const { t } = useT();
  // Close the sheet after a game-changing action so the player sees the new
  // board immediately. Defer one tick so the click finishes before the sheet
  // begins its exit animation.
  const fire = (handler: () => void) => () => {
    handler();
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('menu.title')}>
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
