import { Card } from '@/game/card';
import { CardView } from './Card';
import './StockTalon.css';

export function StockTalon({ stock, talon }: { stock: Card[]; talon: Card[] }) {
  const talonTop = talon[talon.length - 1];
  return (
    <div className="stock-talon">
      <div className="stock-talon__slot stock">
        {stock.length > 0 ? (
          <CardView card={{ ...stock[stock.length - 1], faceUp: false }} />
        ) : (
          <div className="pile-empty" aria-label="stock empty">
            ↻
          </div>
        )}
      </div>
      <div className="stock-talon__slot talon">
        {talonTop ? <CardView card={talonTop} /> : <div className="pile-empty" />}
      </div>
    </div>
  );
}
