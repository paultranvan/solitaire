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
  /** Suppress the dashed placeholder when hidden — the slot already renders
      a card-behind underneath that should show through instead. */
  suppressGhost?: boolean;
};

export function DraggableCard({
  card,
  dragId,
  data,
  hiddenByStackDrag = false,
  suppressGhost = false,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId, data });
  const hidden = isDragging || hiddenByStackDrag;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      {hidden && !suppressGhost && (
        <div className="pile-empty pile-empty--ghost" aria-hidden="true" />
      )}
      <div style={{ opacity: hidden ? 0 : 1 }}>
        <CardView card={card} />
      </div>
    </div>
  );
}
