import { useDraggable } from '@dnd-kit/core';
import { Card as CardModel } from '@/game/card';
import { DragData } from '@/dnd/types';
import { CardView } from './Card';

export type DraggableCardProps = {
  card: CardModel;
  dragId: string;
  data: DragData;
  /** True when another draggable in the same stack is dragging this card along. */
  hiddenByStackDrag?: boolean;
};

export function DraggableCard({ card, dragId, data, hiddenByStackDrag = false }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId, data });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        opacity: isDragging || hiddenByStackDrag ? 0 : 1,
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <CardView card={card} />
    </div>
  );
}
