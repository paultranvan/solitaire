import { useMemo, useState } from 'react';
import { useT } from '@/i18n/useT';
import { NAME_MAX_LENGTH, normalizeName, suggestName } from '@/leaderboard/name';
import { selectPastWins } from '@/leaderboard/pastWins';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useStatsStore } from '@/store/statsStore';
import './PublishStep.css';

// Whether saying yes would also send wins from before the leaderboard existed
// (the one-time import of past wins) — the step has to say so up front.
const useHasPastWins = (): boolean => {
  const games = useStatsStore((s) => s.stats.games);
  const current = useLeaderboardStore((s) => s.current);
  const pastPending = useLeaderboardStore((s) => s.pastPending);
  const pastDone = useLeaderboardStore((s) => s.pastDone);
  return useMemo(() => {
    if (pastDone) return false;
    const wins = pastPending ?? selectPastWins(games, current ? [current.game] : []);
    return wins.length > 0;
  }, [games, current, pastPending, pastDone]);
};

// A globe for the step's medallion. Inline SVG, like the crown: identical on
// every platform and same-origin for the CSP.
function Globe() {
  return (
    <svg className="publish__globe" viewBox="0 0 48 48" focusable="false">
      <circle cx="24" cy="24" r="19" />
      <ellipse cx="24" cy="24" rx="8.5" ry="19" />
      <path d="M5 24 H43 M8.5 13.5 H39.5 M8.5 34.5 H39.5" />
    </svg>
  );
}

// The win sheet's first step, shown once: the first time a win could go to
// the shared leaderboard, the sheet asks before showing anything else — take
// part, and under which name? It stands alone so the question can't be
// scrolled past or mistaken for decoration. Nothing is sent before the player
// presses Publish; declining turns the feature off (it can be switched back
// on in the settings). Either answer moves the sheet on to the results.
export function PublishStep({ score }: { score: number }) {
  const { t, lang, formatNumber } = useT();
  const savedName = useSettingsStore((s) => s.settings.playerName);
  const publish = useLeaderboardStore((s) => s.publish);
  const decline = useLeaderboardStore((s) => s.decline);
  const hasPastWins = useHasPastWins();
  const [name, setName] = useState(() => savedName || suggestName(lang));
  const valid = normalizeName(name) !== null;

  return (
    <div className="publish">
      <div className="sheet-hero" aria-hidden="true">
        <Globe />
      </div>
      <h2 className="sheet-headline">{t('world.stepHeading')}</h2>
      <p className="sheet-sub">{t('world.stepSub')}</p>

      <p className="publish__score">
        <span className="publish__score-label">{t('win.score')}</span>
        <span className="publish__score-value">{formatNumber(score)}</span>
      </p>

      <label className="publish__label" htmlFor="publish-name">
        {t('world.nameLabel')}
      </label>
      <div className="publish__name-row">
        <input
          id="publish-name"
          className="text-input"
          type="text"
          value={name}
          maxLength={NAME_MAX_LENGTH * 2}
          aria-invalid={!valid}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) publish(name);
          }}
        />
        <button
          type="button"
          className="btn btn--ghost publish__reroll"
          aria-label={t('world.reroll')}
          title={t('world.reroll')}
          onClick={() => setName(suggestName(lang))}
        >
          🎲
        </button>
      </div>
      {!valid && (
        <p className="publish__hint publish__hint--err" role="alert">
          {t('world.nameInvalid')}
        </p>
      )}

      <div className="publish__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!valid}
          onClick={() => publish(name)}
        >
          {t('world.publish')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={decline}>
          {t('world.decline')}
        </button>
      </div>

      <p className="publish__hint">
        {t('world.promptNotice')}
        {hasPastWins && ` ${t('world.promptPastWins')}`}
      </p>
    </div>
  );
}
