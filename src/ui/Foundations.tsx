import { Card } from '@/game/card';
import { CardView } from './Card';
import './Foundations.css';

const SUIT_GLYPH: Record<number, string> = { 0: '♥', 1: '♦', 2: '♠', 3: '♣' };

export function Foundations({ piles }: { piles: Card[][] }) {
  return (
    <div className="foundations">
      {piles.map((pile, i) => {
        const top = pile[pile.length - 1];
        return (
          <div key={i} className="foundations__slot">
            {top ? (
              <CardView card={top} />
            ) : (
              <div className="pile-empty" aria-label={`foundation ${i}`}>
                {SUIT_GLYPH[i]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
