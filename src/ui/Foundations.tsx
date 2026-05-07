import { useDroppable } from '@dnd-kit/core';
import { Card, Suit as SuitT } from '@/game/card';
import { foundationDragId, foundationDropId } from '@/dnd/types';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import { HintState, isHintSource, isHintTarget } from './highlight';
import { Suit } from './Suit';
import './Foundations.css';

// Decorative empty-pile glyphs only — foundations accept any suit at runtime
// (see findFoundationFor in game/rules.ts). Don't read business logic into
// the slot order.
const EMPTY_FOUNDATION_SUIT: Record<number, SuitT> = {
  0: 'h',
  1: 'd',
  2: 's',
  3: 'c',
};

function FoundationSlot({ pile, idx, hint }: { pile: Card[]; idx: number; hint: HintState }) {
  const { setNodeRef, isOver } = useDroppable({ id: foundationDropId(idx) });
  const top = pile[pile.length - 1];
  const behind = pile[pile.length - 2];
  const hinted =
    isHintSource(hint, { kind: 'foundation', idx }) ||
    isHintTarget(hint, { kind: 'foundation', idx });

  return (
    <div
      ref={setNodeRef}
      className={`foundations__slot${isOver ? ' is-drop-over' : ''}${hinted ? ' is-hint-pulse' : ''}`}
    >
      {behind && (
        <div className="card-behind" aria-hidden="true">
          <CardView card={behind} />
        </div>
      )}
      {top ? (
        <DraggableCard
          card={top}
          dragId={foundationDragId(idx)}
          data={{
            source: { kind: 'foundationTop', foundationIdx: idx },
            cards: [top],
          }}
          suppressGhost={!!behind}
        />
      ) : (
        <div className="pile-empty" aria-label={`foundation ${idx}`}>
          <Suit suit={EMPTY_FOUNDATION_SUIT[idx]} className="pile-empty__hint" />
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
