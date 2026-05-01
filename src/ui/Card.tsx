import { Card as CardModel, color } from '@/game/card';
import './Card.css';

const SUIT_GLYPH: Record<string, string> = { h: '♥', d: '♦', s: '♠', c: '♣' };
const RANK_LABEL: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
};

const labelFor = (rank: number) => RANK_LABEL[rank] ?? String(rank);

export type CardProps = {
  card: CardModel;
};

export function CardView({ card }: CardProps) {
  if (!card.faceUp) {
    return <div className="card card--back" data-id={card.id} aria-label="face-down card" />;
  }

  const c = color(card.suit);
  const glyph = SUIT_GLYPH[card.suit];
  const label = labelFor(card.rank);

  return (
    <div
      className={`card card--face card--${c}`}
      data-id={card.id}
      aria-label={`${label} of ${card.suit}`}
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
  );
}
