import { DragOverlay } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { CardView } from './Card';
import './DragLayer.css';

export function DragLayer({ cards }: { cards: Card[] | null }) {
  return (
    <DragOverlay dropAnimation={null}>
      {cards ? (
        <div className="drag-stack">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="drag-stack__slot"
              style={{
                marginTop: i === 0 ? 0 : `calc(var(--fan-faceup) - var(--card-h))`,
              }}
            >
              <CardView card={card} ghost />
            </div>
          ))}
        </div>
      ) : null}
    </DragOverlay>
  );
}
