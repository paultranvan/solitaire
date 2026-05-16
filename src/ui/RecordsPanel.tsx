import { useMemo, useState } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { useT } from '@/i18n/useT';
import { modeWins, topScores } from '@/store/records';
import { formatDMY, formatMMSS, formatWinPct } from './format';
import './RecordsPanel.css';

const MEDALS = ['🥇', '🥈', '🥉'];

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="records__stat">
      <span className="records__stat-value">{value}</span>
      <span className="records__stat-label">{label}</span>
    </div>
  );
}

/**
 * Inline per-mode stats panel: a Draw-1 / Draw-3 tab, the mode's play counts,
 * its best score / time / moves, and the top-10 leaderboard.
 */
export function RecordsPanel() {
  const stats = useStatsStore((s) => s.stats);
  const { t, formatNumber, formatBestTime } = useT();
  const [tab, setTab] = useState<'1' | '3'>('1');

  const mode = stats.byMode[tab];
  const rows = useMemo(
    () => topScores(modeWins(stats.games, Number(tab) as 1 | 3), 10),
    [stats.games, tab],
  );
  const numOrDash = (n: number | null) => (n === null ? '—' : formatNumber(n));

  return (
    <div className="records">
      <div className="seg records__tabs">
        {(['1', '3'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`seg__btn${tab === m ? ' is-active' : ''}`}
            onClick={() => setTab(m)}
          >
            {t('stats.draw', { n: m })}
          </button>
        ))}
      </div>

      <div className="records__counts">
        <span className="records__count">
          <b>{formatNumber(mode.played)}</b> {t('stats.played')}
        </span>
        <span className="records__count">
          <b>{formatNumber(mode.won)}</b> {t('stats.won')}
        </span>
        <span className="records__rate">{formatWinPct(mode.won, mode.played)}</span>
      </div>

      <div className="records__summary">
        <SummaryStat value={numOrDash(mode.bestScore)} label={t('stats.bestScore')} />
        <SummaryStat value={formatBestTime(mode.bestTimeSec)} label={t('stats.bestTime')} />
        <SummaryStat value={numOrDash(mode.fewestMovesWin)} label={t('stats.minMoves')} />
      </div>

      <h3 className="records__heading">{t('records.topScores')}</h3>

      {rows.length === 0 ? (
        <p className="records__empty">{t('records.empty')}</p>
      ) : (
        <ol className="records__list">
          {rows.map((r, i) => (
            <li key={`${r.dateMs}-${i}`} className={`lbrow${i < 3 ? ' lbrow--medal' : ''}`}>
              <span className="lbrow__rank">{i < 3 ? MEDALS[i] : i + 1}</span>
              <span className="lbrow__main">
                <span className="lbrow__score">{formatNumber(r.score)}</span>
                <span className="lbrow__meta">
                  {formatDMY(r.dateMs)} · {formatMMSS(r.durationSec)} ·{' '}
                  {t('records.moves', { n: formatNumber(r.moves) })}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
