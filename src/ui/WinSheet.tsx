import { motion } from 'motion/react';
import { useT } from '@/i18n/useT';
import { Sheet } from './Sheet';
import { formatMMSS } from './format';
import './WinSheet.css';

const COLORS = ['#f97316', '#facc15', '#4ade80', '#22d3ee', '#a78bfa', '#f472b6', '#ef4444'];
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
  onPlayAgain,
  durationSec,
  moves,
  drawCount,
  score,
  isNewBest,
  showConfetti = true,
}: {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  durationSec: number;
  moves: number;
  drawCount: 1 | 3;
  score: number;
  isNewBest: boolean;
  showConfetti?: boolean;
}) {
  const { t, formatNumber } = useT();
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
            {isNewBest && <div className="win__score-badge">{t('win.newBest')}</div>}
          </div>

          <div className="win__stats">
            <div className="win__stat">
              <div className="win__stat-value">{formatMMSS(durationSec)}</div>
              <div className="win__stat-label">{t('win.time')}</div>
            </div>
            <div className="win__stat">
              <div className="win__stat-value">{formatNumber(moves)}</div>
              <div className="win__stat-label">{t('win.moves')}</div>
            </div>
            <div className="win__stat">
              <div className="win__stat-value">{drawCount}</div>
              <div className="win__stat-label">{t('win.draw')}</div>
            </div>
          </div>

          <div className="win__actions">
            <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
              {t('win.playAgain')}
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
