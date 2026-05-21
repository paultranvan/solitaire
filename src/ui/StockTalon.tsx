import { Card } from '@/game/card';
import { TALON_DRAG_ID } from '@/dnd/types';
import { useT } from '@/i18n/useT';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import { HintState, isHintSource, isHintTarget } from './highlight';
import './StockTalon.css';

export function StockTalon({
  stock,
  talon,
  drawCount,
  onStockClick,
  onTalonAutoMove,
  hint,
}: {
  stock: Card[];
  talon: Card[];
  drawCount: 1 | 3;
  onStockClick: () => void;
  onTalonAutoMove: () => void;
  hint: HintState;
}) {
  const { t } = useT();
  // In draw-3 we fan up to the last 3 cards so the player can read all three
  // rank/suit corners. In draw-1 we keep the original "top + one peek behind"
  // shape — the fan-offset is 0 in CSS, so the cards stack pixel-perfect.
  const fanSize = drawCount === 3 ? 3 : 2;
  const fanned = talon.slice(-fanSize);
  const talonTop = fanned[fanned.length - 1];
  const behind = talonTop ? fanned.slice(0, -1) : [];
  const talonHinted =
    isHintSource(hint, { kind: 'talon' }) || isHintTarget(hint, { kind: 'talon' });
  const stockHinted =
    isHintSource(hint, { kind: 'stock' }) || isHintTarget(hint, { kind: 'stock' });

  return (
    <div className="stock-talon" data-draw={drawCount}>
      <button
        type="button"
        className={`stock-talon__slot stock${stockHinted ? ' is-hint-pulse' : ''}`}
        onClick={onStockClick}
        aria-label={stock.length > 0 ? t('stock.draw') : t('stock.recycle')}
      >
        {stock.length > 0 ? (
          <CardView card={{ ...stock[stock.length - 1], faceUp: false }} />
        ) : (
          <div className="pile-empty">↻</div>
        )}
      </button>
      <div className="stock-talon__slot talon" onClick={onTalonAutoMove}>
        {behind.map((card, i) => (
          <div
            key={card.id}
            className="talon-fan__behind"
            // i=0 is the oldest visible card (leftmost), i=behind.length-1 is
            // the card directly under the top. Each step adds one fan-offset
            // of horizontal exposure to reveal the rank/suit corner.
            style={{ ['--talon-fan-i' as string]: i }}
            aria-hidden="true"
          >
            <CardView card={card} />
          </div>
        ))}
        {talonTop ? (
          <div className={`talon-fan__top${talonHinted ? ' is-hint-pulse' : ''}`}>
            <DraggableCard
              card={talonTop}
              dragId={TALON_DRAG_ID}
              data={{ source: { kind: 'talonTop' }, cards: [talonTop] }}
              suppressGhost={behind.length > 0}
            />
          </div>
        ) : (
          <div className="pile-empty" />
        )}
      </div>
    </div>
  );
}
