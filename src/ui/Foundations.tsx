import { useDndContext, useDroppable } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { foundationDropId } from '@/dnd/types';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import { HintState, isHintSource, isHintTarget } from './hints';
import './Foundations.css';

const SUIT_GLYPH: Record<number, string> = { 0: '♥', 1: '♦', 2: '♠', 3: '♣' };

function FoundationSlot({ pile, idx, hint }: { pile: Card[]; idx: number; hint: HintState }) {
  const { setNodeRef, isOver } = useDroppable({ id: foundationDropId(idx) });
  const { active } = useDndContext();
  const top = pile[pile.length - 1];
  const behind = pile[pile.length - 2];
  // Only reveal the card-behind while the top is actually being dragged.
  // Otherwise an auto-move's layoutId flight would expose it mid-animation
  // and read as a flicker.
  const showBehind = !!behind && active?.id === `f:${idx}`;
  const hinted =
    isHintSource(hint, { kind: 'foundation', idx }) ||
    isHintTarget(hint, { kind: 'foundation', idx });

  return (
    <div
      ref={setNodeRef}
      className={`foundations__slot${isOver ? ' foundations__slot--over' : ''}${hinted ? ' is-hinted' : ''}`}
    >
      {showBehind && (
        <div className="card-behind" aria-hidden="true">
          <CardView card={behind} />
        </div>
      )}
      {top ? (
        <DraggableCard
          card={top}
          dragId={`f:${idx}`}
          data={{
            source: { kind: 'foundationTop', foundationIdx: idx },
            cards: [top],
          }}
          suppressGhost={showBehind}
        />
      ) : (
        <div className="pile-empty" aria-label={`foundation ${idx}`}>
          {SUIT_GLYPH[idx]}
        </div>
      )}
    </div>
  );
}

export function Foundations({ piles, hint }: { piles: Card[][]; hint: HintState }) {
  return (
    <div className="foundations">
      {piles.map((pile, i) => (
        <FoundationSlot key={i} pile={pile} idx={i} hint={hint} />
      ))}
    </div>
  );
}
