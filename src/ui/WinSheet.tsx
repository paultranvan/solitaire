import { motion } from 'motion/react';
import { Sheet } from './Sheet';
import './WinSheet.css';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

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
}: {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  durationSec: number;
  moves: number;
  drawCount: 1 | 3;
}) {
  return (
    <>
      {open && <Confetti />}
      <Sheet open={open} onClose={onClose} title="You won!">
        <div className="win">
          <div className="win__hero">🎉</div>
          <h2 className="win__title">Congratulations</h2>
          <p className="win__subtitle">You cleared the board.</p>

          <div className="win__stats">
            <div className="win__stat">
              <div className="win__stat-value">{fmt(durationSec)}</div>
              <div className="win__stat-label">Time</div>
            </div>
            <div className="win__stat">
              <div className="win__stat-value">{moves}</div>
              <div className="win__stat-label">Moves</div>
            </div>
            <div className="win__stat">
              <div className="win__stat-value">{drawCount}</div>
              <div className="win__stat-label">Draw</div>
            </div>
          </div>

          <div className="win__actions">
            <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
              Play again
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
