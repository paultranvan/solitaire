import { useState } from 'react';
import { motion } from 'motion/react';
import './Confetti.css';

const PALETTES = {
  // The table's own colours: golds and parchment, with the card red, a felt
  // green and the navy of the default card back as accents.
  table: ['#f0d08c', '#d8b66f', '#f3ecd9', '#e2574c', '#62c184', '#7fa3ea', '#f0d08c'],
  // Nothing but gold, for the second shower a world record earns.
  gold: ['#f6dc9a', '#f0d08c', '#d8b66f', '#fff3c9', '#b8892f'],
} as const;

type Piece = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotateEnd: number;
  drift: number;
};

const makePieces = (colors: readonly string[], count: number): Piece[] =>
  Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.6 + Math.random() * 1.4,
    color: colors[i % colors.length],
    rotateEnd: (Math.random() - 0.5) * 720,
    drift: (Math.random() - 0.5) * 80,
  }));

// A one-off shower over the whole screen. The pieces are drawn once, when the
// component mounts: a re-render of the parent mid-fall must not re-roll them,
// or every piece would jump to a new trajectory.
export function Confetti({
  palette = 'table',
  pieces = 60,
}: {
  palette?: keyof typeof PALETTES;
  pieces?: number;
}) {
  const [list] = useState(() => makePieces(PALETTES[palette], pieces));
  return (
    <div className="confetti" aria-hidden>
      {list.map((p, i) => (
        <motion.span
          key={i}
          className="confetti__piece"
          style={{ left: `${p.left}%`, background: p.color }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 0 }}
          animate={{ y: '120vh', x: p.drift, rotate: p.rotateEnd, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
            times: [0, 0.05, 0.9, 1],
          }}
        />
      ))}
    </div>
  );
}
