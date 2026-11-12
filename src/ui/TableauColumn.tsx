import type { CSSProperties } from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { DragData, tableauCardDragId, tableauColumnDropId } from '@/dnd/types';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import { HintState, isHintSource, isHintTarget } from './highlight';
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
  onAutoMove: (cardIndex: number) => void;
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

  // Face-down / face-up counts feed the CSS that squeezes this column's fan
  // when the stack would otherwise run past the bottom of the viewport (see
  // TableauColumn.css).
  const faceDownCount = cards.reduce((n, c) => n + (c.faceUp ? 0 : 1), 0);
  const fanCounts = {
    '--n-down': faceDownCount,
    '--n-up': cards.length - faceDownCount,
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      // No drop ring on the column the stack was just lifted from — the
      // pointer starts inside it, so it would light up on every pick-up.
      className={`tableau-col${isOver && dragFromIndex === null ? ' is-drop-target' : ''}${
        columnHinted ? ' is-hinted' : ''
      }`}
      style={fanCounts}
      data-column={column}
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
              ? `calc(var(--fan-up-col) - var(--card-h))`
              : `calc(var(--fan-down-col) - var(--card-h))`;

          const isStackHinted =
            isHintSource(hint, { kind: 'tableauStack', column, cardIndex: i }) ||
            (i === cards.length - 1 && isHintSource(hint, { kind: 'tableauTop', column }));

          return (
            <div
              key={card.id}
              className={`tableau-col__slot${isStackHinted ? ' is-hinted' : ''}`}
              style={{ marginTop: offset }}
              onClick={card.faceUp ? () => onAutoMove(i) : undefined}
            >
              {card.faceUp ? (
                <DraggableCard
                  card={card}
                  dragId={tableauCardDragId(column, i)}
                  data={{
                    source: { kind: 'tableauStack', column, fromIndex: i },
                    cards: cards.slice(i),
                  }}
                  hiddenByStackDrag={dragFromIndex !== null && i > dragFromIndex}
                  // Only the column's first card leaves a hole worth marking
                  // (the column reads as empty while it's lifted). Higher up
                  // the stack, the card underneath is the placeholder — a
                  // well drawn there would just darken it.
                  suppressGhost={i > 0}
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
