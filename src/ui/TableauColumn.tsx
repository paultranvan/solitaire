import { Card } from '@/game/card';
import { CardView } from './Card';
import './TableauColumn.css';

export function TableauColumn({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return (
      <div className="tableau-col">
        <div className="pile-empty" />
      </div>
    );
  }
  return (
    <div className="tableau-col">
      {cards.map((card, i) => (
        <div
          key={card.id}
          className="tableau-col__slot"
          style={{
            marginTop:
              i === 0
                ? 0
                : cards[i - 1].faceUp
                  ? `calc(var(--fan-faceup) - var(--card-h))`
                  : `calc(var(--fan-facedown) - var(--card-h))`,
          }}
        >
          <CardView card={card} />
        </div>
      ))}
    </div>
  );
}
