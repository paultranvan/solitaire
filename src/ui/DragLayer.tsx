import type { CSSProperties } from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { CardView } from './Card';
import './DragLayer.css';

export function DragLayer({
  cards,
  fanPx = null,
}: {
  cards: Card[] | null;
  /** Fan step (px) of the column the stack was lifted from, when known; null
      uses the default --fan-faceup. Keeps the lifted stack the same shape it
      had in a squeezed column. */
  fanPx?: number | null;
}) {
  const fanStyle = fanPx === null ? undefined : ({ '--fan-faceup': `${fanPx}px` } as CSSProperties);
  return (
    <DragOverlay dropAnimation={null}>
      {cards ? (
        <div className="drag-stack" style={fanStyle}>
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
