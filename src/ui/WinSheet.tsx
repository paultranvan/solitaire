import { motion } from 'motion/react';
import { useT } from '@/i18n/useT';
import type { Ranking } from '@/store/records';
import { Crown } from './Crown';
import { Sheet } from './Sheet';
import { formatMMSS, formatOrdinal } from './format';
import { WorldRank } from './WorldRank';
import './WinSheet.css';

// Confetti in the table's own colours: golds and parchment, with the card
// red, a felt green and the navy of the default card back as accents.
const COLORS = ['#f0d08c', '#d8b66f', '#f3ecd9', '#e2574c', '#62c184', '#7fa3ea', '#f0d08c'];
const PIECES = 60;

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
          <div className="sheet-hero" aria-hidden="true">
            <Crown className="win__crown" />
          </div>
          <h2 className="sheet-headline">{t('win.heading')}</h2>
          <p className="sheet-sub">{t('win.subtitle')}</p>

          <div className="win__score">
            <div className="win__score-value">{formatNumber(score)}</div>
            <div className="win__score-label">{t('win.score')}</div>
          </div>

          {ranking !== null && bannerKey === null && (
            <p className="win__rank">
              {t('win.rankLine', {
                rank: formatOrdinal(ranking.rank, lang),
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

          {/* Shared-leaderboard standing or the one-time publish prompt. Renders
              nothing when the feature is off or this win isn't eligible. */}
          <WorldRank />

          <div className="win__stats win__stats--pair">
            <div className={`win__stat${ranking && ranking.timeMedal ? ' win__stat--medal' : ''}`}>
              <div className="win__stat-value">{formatMMSS(durationSec)}</div>
              <div className="win__stat-label">
                {medalLabel('Time', ranking?.timeMedal ?? 0) ?? t('win.time')}
              </div>
            </div>
            <div className={`win__stat${ranking && ranking.movesMedal ? ' win__stat--medal' : ''}`}>
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
