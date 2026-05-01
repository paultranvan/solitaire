import { DragOverlay } from '@dnd-kit/core';
import { motion } from 'motion/react';
import { Card } from '@/game/card';
import { SPRING_LIFT } from '@/motion/presets';
import { CardView } from './Card';
import './DragLayer.css';

export function DragLayer({ cards }: { cards: Card[] | null }) {
  return (
    <DragOverlay dropAnimation={null}>
      {cards ? (
        <motion.div
          className="drag-stack"
          initial={{ scale: 1, rotate: 0 }}
          animate={{ scale: 1.06, rotate: 1.5 }}
          transition={SPRING_LIFT}
        >
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="drag-stack__slot"
              style={{
                marginTop: i === 0 ? 0 : `calc(var(--fan-faceup) - var(--card-h))`,
              }}
            >
              <CardView card={card} ghost />
            </div>
          ))}
        </motion.div>
      ) : null}
    </DragOverlay>
  );
}
