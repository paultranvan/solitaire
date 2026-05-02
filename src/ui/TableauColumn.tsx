import { useDndContext, useDroppable } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { DragData, tableauColumnDropId } from '@/dnd/types';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import { HintState, isHintSource, isHintTarget } from './hints';
import './TableauColumn.css';

export function TableauColumn({
  cards,
  column,
  hint,
  onAutoMove,
}: {
  cards: Card[];
  column: number;
  hint: HintState;
  onAutoMove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tableauColumnDropId(column) });
  const columnHinted = isHintTarget(hint, { kind: 'tableauColumn', column });

  // When a tableau-stack drag picks up cards [fromIndex..end], the cards below
  // the grabbed one need to be hidden too — only the grabbed card's own
  // DraggableCard sees `isDragging`, so the rest stay visible without this.
  const { active } = useDndContext();
  const activeData = active?.data.current as DragData | undefined;
  const dragFromIndex =
    activeData?.source.kind === 'tableauStack' && activeData.source.column === column
      ? activeData.source.fromIndex
      : null;

  return (
    <div
      ref={setNodeRef}
      className={`tableau-col${isOver ? ' tableau-col--over' : ''}${columnHinted ? ' is-hinted' : ''}`}
      onDoubleClick={onAutoMove}
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

          const isStackHinted =
            isHintSource(hint, { kind: 'tableauStack', column, cardIndex: i }) ||
            (i === cards.length - 1 && isHintSource(hint, { kind: 'tableauTop', column }));

          return (
            <div
              key={card.id}
              className={`tableau-col__slot${isStackHinted ? ' is-hinted' : ''}`}
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
                  hiddenByStackDrag={dragFromIndex !== null && i > dragFromIndex}
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
