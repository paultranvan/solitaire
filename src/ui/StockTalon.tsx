import type { CSSProperties } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { Card } from '@/game/card';
import { TALON_DRAG_ID } from '@/dnd/types';
import { useT } from '@/i18n/useT';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import { HintState, isHintSource, isHintTarget } from './highlight';
import './StockTalon.css';

const TALON_FAN_SIZE = 3;

export function StockTalon({
  stock,
  talon,
  onStockClick,
  onTalonAutoMove,
  hint,
}: {
  stock: Card[];
  talon: Card[];
  onStockClick: () => void;
  onTalonAutoMove: () => void;
  hint: HintState;
}) {
  const { t } = useT();
  // The waste always fans its last 3 cards (in draw-1 as much as draw-3), each
  // covered card keeping a strip wide enough to read its rank and suit.
  const fanned = talon.slice(-TALON_FAN_SIZE);
  const talonTop = fanned[fanned.length - 1];
  const behind = talonTop ? fanned.slice(0, -1) : [];
  // Lifting the top card uncovers the whole card under it, so that one drops
  // its compact index and reads as a normal card for the duration of the drag.
  const topLifted = useDndContext().active?.id === TALON_DRAG_ID;
  // --talon-fan-i is the card's slot from the left (0 = oldest visible);
  // --talon-fan-free is how many of the 3 slots are unused, which the CSS uses
  // to keep a short fan against the stock whichever side the stock is on.
  // `count` is how many cards the fan holds — overridden for the empty-waste
  // placeholder, which stands in for a single card.
  const fanStyle = (i: number, count = fanned.length) =>
    ({
      '--talon-fan-i': i,
      '--talon-fan-free': TALON_FAN_SIZE - count,
    }) as CSSProperties;
  const talonHinted =
    isHintSource(hint, { kind: 'talon' }) || isHintTarget(hint, { kind: 'talon' });
  const stockHinted =
    isHintSource(hint, { kind: 'stock' }) || isHintTarget(hint, { kind: 'stock' });
  // How thick the face-down pile looks: 0 = a single card (or none), up to 2
  // extra card edges peeking out under the top one. Purely decorative.
  const stockDepth = stock.length > 12 ? 2 : stock.length > 1 ? 1 : 0;

  return (
    <div className="stock-talon">
      <button
        type="button"
        className={`stock-talon__slot stock${stockHinted ? ' is-hint-pulse' : ''}`}
        onClick={onStockClick}
        aria-label={stock.length > 0 ? t('stock.draw') : t('stock.recycle')}
        data-depth={stockDepth}
      >
        {stock.length > 0 ? (
          <CardView card={{ ...stock[stock.length - 1], faceUp: false }} />
        ) : (
          <div className={`pile-empty${talon.length === 0 ? ' is-spent' : ''}`}>
            <svg
              className="pile-empty__hint"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 12a8 8 0 1 1-2.6-5.9" />
              <path d="M20 4v5h-5" />
            </svg>
          </div>
        )}
      </button>
      <div className="stock-talon__slot talon" onClick={onTalonAutoMove}>
        {behind.map((card, i) => (
          <div
            key={card.id}
            className={`talon-fan__card talon-fan__behind${
              topLifted && i === behind.length - 1 ? ' is-uncovered' : ''
            }`}
            style={fanStyle(i)}
            aria-hidden="true"
          >
            <CardView card={card} />
          </div>
        ))}
        {talonTop ? (
          <div
            className={`talon-fan__card talon-fan__top${talonHinted ? ' is-hint-pulse' : ''}`}
            style={fanStyle(behind.length)}
          >
            <DraggableCard
              card={talonTop}
              dragId={TALON_DRAG_ID}
              data={{ source: { kind: 'talonTop' }, cards: [talonTop] }}
              suppressGhost={behind.length > 0}
            />
          </div>
        ) : (
          // Empty waste: the well sits where the first drawn card will land —
          // against the stock — not at the far end of the 3-card-wide slot.
          <div className="talon-fan__card" style={fanStyle(0, 1)}>
            <div className="pile-empty" />
          </div>
        )}
      </div>
    </div>
  );
}
