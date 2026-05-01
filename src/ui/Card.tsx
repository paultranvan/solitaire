import { motion } from 'motion/react';
import { Card as CardModel, color } from '@/game/card';
import { SPRING_DEFAULT, SPRING_FLIP } from '@/motion/presets';
import './Card.css';

const SUIT_GLYPH: Record<string, string> = { h: '♥', d: '♦', s: '♠', c: '♣' };
const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const labelFor = (rank: number) => RANK_LABEL[rank] ?? String(rank);

export type CardProps = {
  card: CardModel;
  /** Set to true to skip layoutId (e.g., when this card is rendered in a DragOverlay). */
  ghost?: boolean;
};

export function CardView({ card, ghost = false }: CardProps) {
  const c = color(card.suit);
  const glyph = SUIT_GLYPH[card.suit];
  const label = labelFor(card.rank);

  return (
    <motion.div
      className="card-flip"
      layoutId={ghost ? undefined : card.id}
      transition={SPRING_DEFAULT}
      aria-label={card.faceUp ? `${label} of ${card.suit}` : 'face-down card'}
    >
      <motion.div
        className="card-flip__inner"
        animate={{ rotateY: card.faceUp ? 180 : 0 }}
        transition={SPRING_FLIP}
      >
        <div
          className="card-flip__face card-flip__back card card--back"
          aria-hidden={card.faceUp}
        />
        <div
          className={`card-flip__face card-flip__front card card--face card--${c}`}
          aria-hidden={!card.faceUp}
        >
          <div className="card__corner card__corner--tl">
            <span className="card__rank">{label}</span>
            <span className="card__suit-small">{glyph}</span>
          </div>
          <div className="card__center">{glyph}</div>
          <div className="card__corner card__corner--br">
            <span className="card__rank">{label}</span>
            <span className="card__suit-small">{glyph}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
