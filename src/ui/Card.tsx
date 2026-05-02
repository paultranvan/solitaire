import { createContext, useContext } from 'react';
import { motion } from 'motion/react';
import { Card as CardModel, color } from '@/game/card';
import { SPRING_DEFAULT } from '@/motion/presets';
import './Card.css';

const SUIT_GLYPH: Record<string, string> = { h: '♥', d: '♦', s: '♠', c: '♣' };
const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const labelFor = (rank: number) => RANK_LABEL[rank] ?? String(rank);

/* True for a single render after a drag-drop, so motion/react skips the
   layoutId fly-from-source animation (the card was visually at the cursor,
   not the source slot). Auto-moves keep the animation. */
const SkipLayoutAnimContext = createContext(false);
export const SkipLayoutAnimProvider = SkipLayoutAnimContext.Provider;

export type CardProps = {
  card: CardModel;
  /** Set to true to skip layoutId (e.g., when this card is rendered in a DragOverlay). */
  ghost?: boolean;
};

export function CardView({ card, ghost = false }: CardProps) {
  const c = color(card.suit);
  const glyph = SUIT_GLYPH[card.suit];
  const label = labelFor(card.rank);
  const skipLayoutAnim = useContext(SkipLayoutAnimContext);
  const layoutTransition = skipLayoutAnim ? { duration: 0 } : SPRING_DEFAULT;

  return (
    <motion.div
      // key forces a fresh motion node when the card identity changes. Without
      // it, React reuses the same motion.div when a parent slot's `card` prop
      // swaps (e.g. the talon top after a draw), and motion's shared-layout
      // crossfade then fades the SAME element out — making the new card briefly
      // disappear into the previous card sitting behind it.
      key={card.id}
      className="card-flip"
      layoutId={ghost ? undefined : card.id}
      transition={layoutTransition}
      aria-label={card.faceUp ? `${label} of ${card.suit}` : 'face-down card'}
    >
      {/* The flip is a plain CSS transition — keeping rotateY out of motion's
          value tracking. motion's resetSkewAndRotation step (run on every
          layout update) would otherwise strip rotateY from all face-up cards
          for 1–2ms while measuring boxes, and the browser can paint that gap,
          flashing the card backs across the whole board. */}
      <div className={`card-flip__inner${card.faceUp ? ' is-faceup' : ''}`}>
        <div
          className="card-flip__face card-flip__back card card--back"
          aria-hidden={card.faceUp}
        />
        <div
          className={`card-flip__face card-flip__front card card--face card--${c}`}
          aria-hidden={!card.faceUp}
        >
          <div className="card__corner">
            <span className="card__rank">{label}</span>
            <span className="card__suit">{glyph}</span>
          </div>
          <div className="card__center">{glyph}</div>
        </div>
      </div>
    </motion.div>
  );
}
