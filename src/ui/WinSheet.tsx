import { motion } from 'motion/react';
import { useT } from '@/i18n/useT';
import type { Ranking } from '@/store/records';
import { Sheet } from './Sheet';
import { formatMMSS } from './format';
import './WinSheet.css';

const COLORS = ['#f97316', '#facc15', '#4ade80', '#22d3ee', '#a78bfa', '#f472b6', '#ef4444'];
const PIECES = 60;

// "1st", "2nd", "3rd", "21st", "26th"… English only; French uses "{n}e".
const ordinalEn = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

const ordinal = (n: number, lang: 'en' | 'fr'): string =>
  lang === 'fr' ? (n === 1 ? '1re' : `${n}e`) : ordinalEn(n);

function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: PIECES }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.6 + Math.random() * 1.4;
        const color = COLORS[i % COLORS.length];
        const rotateEnd = (Math.random() - 0.5) * 720;
        const drift = (Math.random() - 0.5) * 80;
        return (
          <motion.span
            key={i}
            className="confetti__piece"
            style={{ left: `${left}%`, background: color }}
            initial={{ y: -20, x: 0, rotate: 0, opacity: 0 }}
            animate={{ y: '120vh', x: drift, rotate: rotateEnd, opacity: [0, 1, 1, 0] }}
            transition={{ duration, delay, ease: 'easeIn', times: [0, 0.05, 0.9, 1] }}
          />
        );
      })}
    </div>
  );
}

export function WinSheet({
  open,
  onClose,
  onNewGame,
  onReplay,
  durationSec,
  moves,
  score,
  ranking,
  showConfetti = true,
}: {
  open: boolean;
  onClose: () => void;
  onNewGame: () => void;
  onReplay: () => void;
  durationSec: number;
  moves: number;
  score: number;
  ranking: Ranking | null;
  showConfetti?: boolean;
}) {
  const { t, formatNumber, lang } = useT();

  const bannerKey =
    ranking === null || ranking.rank > 3
      ? null
      : (['win.bannerGold', 'win.bannerSilver', 'win.bannerBronze'] as const)[ranking.rank - 1];

  const medalLabel = (kind: 'Time' | 'Moves', placement: 0 | 1 | 2 | 3) =>
    placement === 0 ? null : t(`win.medal${kind}${placement}` as const);

  return (
    <>
      {open && showConfetti && <Confetti />}
      <Sheet open={open} onClose={onClose} title={t('win.title')}>
        <div className="win">
          <div className="win__hero">🎉</div>
          <h2 className="win__title">{t('win.heading')}</h2>
          <p className="win__subtitle">{t('win.subtitle')}</p>

          <div className="win__score">
            <div className="win__score-value">{formatNumber(score)}</div>
            <div className="win__score-label">{t('win.score')}</div>
          </div>

          {ranking !== null && bannerKey === null && (
            <p className="win__rank">
              {t('win.rankLine', {
                rank: ordinal(ranking.rank, lang),
                total: formatNumber(ranking.total),
              })}
            </p>
          )}
          {ranking !== null && bannerKey !== null && (
            <div className="win__banner">
              <span className="win__banner-msg">{t(bannerKey)}</span>
              <span className="win__banner-sub">
                {t('win.rankOutOf', { total: formatNumber(ranking.total) })}
              </span>
            </div>
          )}

          <div className="win__stats win__stats--pair">
            <div
              className={`win__stat${ranking && ranking.timeMedal ? ' win__stat--medal' : ''}`}
            >
              <div className="win__stat-value">{formatMMSS(durationSec)}</div>
              <div className="win__stat-label">
                {medalLabel('Time', ranking?.timeMedal ?? 0) ?? t('win.time')}
              </div>
            </div>
            <div
              className={`win__stat${ranking && ranking.movesMedal ? ' win__stat--medal' : ''}`}
            >
              <div className="win__stat-value">{formatNumber(moves)}</div>
              <div className="win__stat-label">
                {medalLabel('Moves', ranking?.movesMedal ?? 0) ?? t('win.moves')}
              </div>
            </div>
          </div>

          <div className="win__actions">
            <button type="button" className="btn btn--primary" onClick={onNewGame}>
              {t('win.newGame')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onReplay}>
              {t('win.replay')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t('win.close')}
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
