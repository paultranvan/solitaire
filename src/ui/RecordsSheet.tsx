import { useState } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { useT } from '@/i18n/useT';
import { topScores } from '@/store/records';
import { Sheet } from './Sheet';
import { formatDMY, formatMMSS } from './format';
import './RecordsSheet.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export function RecordsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const stats = useStatsStore((s) => s.stats);
  const { t, formatNumber, formatBestTime } = useT();
  const [tab, setTab] = useState<'1' | '3'>('1');

  const mode = stats.byMode[tab];
  const rows = topScores(mode.wins, 10);

  return (
    <Sheet open={open} onClose={onClose} title={t('records.title')}>
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

        <div className="records__summary">
          <div className="records__stat">
            <span className="records__stat-value">
              {mode.bestScore === null ? '—' : formatNumber(mode.bestScore)}
            </span>
            <span className="records__stat-label">{t('stats.bestScore')}</span>
          </div>
          <div className="records__stat">
            <span className="records__stat-value">{formatBestTime(mode.bestTimeSec)}</span>
            <span className="records__stat-label">{t('stats.bestTime')}</span>
          </div>
          <div className="records__stat">
            <span className="records__stat-value">
              {mode.fewestMovesWin === null ? '—' : formatNumber(mode.fewestMovesWin)}
            </span>
            <span className="records__stat-label">{t('stats.minMoves')}</span>
          </div>
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
    </Sheet>
  );
}
