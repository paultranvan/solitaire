import { useMemo, useState } from 'react';
import { useT } from '@/i18n/useT';
import { NAME_MAX_LENGTH, normalizeName, suggestName } from '@/leaderboard/name';
import { selectPastWins } from '@/leaderboard/pastWins';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useStatsStore } from '@/store/statsStore';
import { formatOrdinal } from './format';
import './WorldRank.css';

// Whether saying yes would also send wins from before the leaderboard existed
// (the one-time import of past wins) — the prompt has to say so up front.
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

// The one-time question asked on the first eligible win: take part in the
// shared leaderboard, under which name? Nothing is sent before the player
// presses Publish, and declining turns the feature off for good (it can be
// re-enabled in the settings).
function PublishPrompt() {
  const { t, lang } = useT();
  const savedName = useSettingsStore((s) => s.settings.playerName);
  const publish = useLeaderboardStore((s) => s.publish);
  const decline = useLeaderboardStore((s) => s.decline);
  const hasPastWins = useHasPastWins();
  const [name, setName] = useState(() => savedName || suggestName(lang));
  const valid = normalizeName(name) !== null;

  return (
    <div className="world world--prompt">
      <p className="world__title">{t('world.promptTitle')}</p>
      <div className="world__name-row">
        <input
          className="text-input"
          type="text"
          value={name}
          maxLength={NAME_MAX_LENGTH * 2}
          aria-label={t('world.nameLabel')}
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
          className="btn btn--ghost world__reroll"
          aria-label={t('world.reroll')}
          title={t('world.reroll')}
          onClick={() => setName(suggestName(lang))}
        >
          🎲
        </button>
      </div>
      {!valid && (
        <p className="world__hint world__hint--err" role="alert">
          {t('world.nameInvalid')}
        </p>
      )}
      <p className="world__hint">
        {t('world.promptNotice')}
        {hasPastWins && ` ${t('world.promptPastWins')}`}
      </p>
      <div className="world__actions">
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
    </div>
  );
}

// Where the win just played stands on the shared leaderboard — or the publish
// prompt, the first time. Self-contained: reads the leaderboard store, so the
// win sheet needs no extra props.
export function WorldRank() {
  const current = useLeaderboardStore((s) => s.current);
  const { t, formatNumber, lang } = useT();
  if (current === null) return null;

  const { status } = current;
  if (status.kind === 'prompt') return <PublishPrompt />;

  let line: string;
  switch (status.kind) {
    case 'sending':
      line = t('world.sending');
      break;
    case 'ranked':
      line = t(status.accepted ? 'world.ranked' : 'world.alreadyRanked', {
        rank: formatOrdinal(status.rank, lang),
        total: formatNumber(status.total),
      });
      break;
    case 'queued':
      line = t('world.queued');
      break;
    case 'rejected':
      line = t('world.rejected');
      break;
  }
  return (
    <p className={`world world--status world--${status.kind}`} role="status">
      {line}
    </p>
  );
}
