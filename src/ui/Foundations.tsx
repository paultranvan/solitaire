import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { foundationDropId } from '@/dnd/types';
import { DraggableCard } from './DraggableCard';
import './Foundations.css';

const SUIT_GLYPH: Record<number, string> = { 0: '♥', 1: '♦', 2: '♠', 3: '♣' };

function FoundationSlot({ pile, idx }: { pile: Card[]; idx: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: foundationDropId(idx) });
  const top = pile[pile.length - 1];

  return (
    <div
      ref={setNodeRef}
      className={`foundations__slot${isOver ? ' foundations__slot--over' : ''}`}
    >
      {top ? (
        <DraggableCard
          card={top}
          dragId={`f:${idx}`}
          data={{
            source: { kind: 'foundationTop', foundationIdx: idx },
            cards: [top],
          }}
        />
      ) : (
        <div className="pile-empty" aria-label={`foundation ${idx}`}>
          {SUIT_GLYPH[idx]}
        </div>
      )}
    </div>
  );
}

export function Foundations({ piles }: { piles: Card[][] }) {
  return (
    <div className="foundations">
      {piles.map((pile, i) => (
        <FoundationSlot key={i} pile={pile} idx={i} />
      ))}
    </div>
  );
}
