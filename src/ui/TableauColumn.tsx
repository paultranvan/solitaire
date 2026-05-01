import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { tableauColumnDropId } from '@/dnd/types';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import './TableauColumn.css';

export function TableauColumn({ cards, column }: { cards: Card[]; column: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: tableauColumnDropId(column) });

  return (
    <div
      ref={setNodeRef}
      className={`tableau-col${isOver ? ' tableau-col--over' : ''}`}
    >
      {cards.length === 0 ? (
        <div className="pile-empty" />
      ) : (
        cards.map((card, i) => {
          const isFirst = i === 0;
          const prev = cards[i - 1];
          const offset = isFirst
            ? 0
            : prev.faceUp
              ? `calc(var(--fan-faceup) - var(--card-h))`
              : `calc(var(--fan-facedown) - var(--card-h))`;
          return (
            <div
              key={card.id}
              className="tableau-col__slot"
              style={{ marginTop: offset }}
            >
              {card.faceUp ? (
                <DraggableCard
                  card={card}
                  dragId={`t:${column}:${i}`}
                  data={{
                    source: { kind: 'tableauStack', column, fromIndex: i },
                    cards: cards.slice(i),
                  }}
                />
              ) : (
                <CardView card={card} />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
