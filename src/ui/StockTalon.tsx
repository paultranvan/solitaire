import { Card } from '@/game/card';
import { CardView } from './Card';
import { DraggableCard } from './DraggableCard';
import { HintState, isHintSource, isHintTarget } from './hints';
import './StockTalon.css';

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
  const talonTop = talon[talon.length - 1];
  const talonHinted =
    isHintSource(hint, { kind: 'talon' }) || isHintTarget(hint, { kind: 'talon' });

  return (
    <div className="stock-talon">
      <button
        type="button"
        className="stock-talon__slot stock"
        onClick={onStockClick}
        aria-label={stock.length > 0 ? 'draw' : 'recycle'}
      >
        {stock.length > 0 ? (
          <CardView card={{ ...stock[stock.length - 1], faceUp: false }} />
        ) : (
          <div className="pile-empty">↻</div>
        )}
      </button>
      <div
        className={`stock-talon__slot talon${talonHinted ? ' is-hinted' : ''}`}
        onDoubleClick={onTalonAutoMove}
      >
        {talonTop ? (
          <DraggableCard
            card={talonTop}
            dragId="talon-top"
            data={{ source: { kind: 'talonTop' }, cards: [talonTop] }}
          />
        ) : (
          <div className="pile-empty" />
        )}
      </div>
    </div>
  );
}
