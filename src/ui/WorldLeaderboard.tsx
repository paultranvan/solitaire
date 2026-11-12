import { useEffect, useState } from 'react';
import { useT } from '@/i18n/useT';
import { fetchLeaderboard, type WorldBoard } from '@/leaderboard/api';
import { useSettingsStore } from '@/store/settingsStore';
import { formatDMY, formatMMSS } from './format';

const MEDALS = ['🥇', '🥈', '🥉'];

type LoadState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; board: WorldBoard };

// Shared (cross-player) top scores for one draw mode, fetched from the
// leaderboard worker each time the panel is shown or the mode changes.
export function WorldLeaderboard({ drawCount }: { drawCount: 1 | 3 }) {
  const { t, formatNumber } = useT();
  const playerName = useSettingsStore((s) => s.settings.playerName);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    void fetchLeaderboard(drawCount, controller.signal).then((board) => {
      // An aborted request resolves to null too; don't let it overwrite the
      // state of the request that replaced it (mode switch, StrictMode remount).
      if (controller.signal.aborted) return;
      setState(board === null ? { kind: 'error' } : { kind: 'ready', board });
    });
    return () => controller.abort();
  }, [drawCount]);

  if (state.kind === 'loading') {
    return <p className="records__empty">{t('records.worldLoading')}</p>;
  }
  if (state.kind === 'error') {
    return (
      <p className="records__empty" role="alert">
        {t('records.worldError')}
      </p>
    );
  }
  const { entries, total } = state.board;
  if (entries.length === 0) return <p className="records__empty">{t('records.worldEmpty')}</p>;

  return (
    <>
      <h3 className="records__heading">
        {t('records.worldTop', { n: entries.length })}
        <span className="records__heading-note">
          {t('records.worldTotal', { n: formatNumber(total) })}
        </span>
      </h3>
      <ol className="records__list">
        {entries.map((e, i) => (
          <li
            key={`${e.dateMs}-${i}`}
            className={`lbrow${e.rank <= 3 ? ' lbrow--medal' : ''}${
              playerName !== '' && e.name === playerName ? ' lbrow--me' : ''
            }`}
          >
            <span className="lbrow__rank">{e.rank <= 3 ? MEDALS[e.rank - 1] : e.rank}</span>
            <span className="lbrow__main">
              <span className="lbrow__score">
                {formatNumber(e.score)}
                <span className="lbrow__name">{e.name}</span>
              </span>
              <span className="lbrow__meta">
                {formatDMY(e.dateMs)} · {formatMMSS(e.durationSec)} ·{' '}
                {t('records.moves', { n: formatNumber(e.moves) })}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
