import { Transition } from 'motion/react';

// Critically damped (damping ≥ 2·√(k·m) ≈ 37.4) so layout transitions land
// on their destination without overshoot — auto-moves used to visibly bounce.
export const SPRING_DEFAULT: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 40,
  mass: 0.7,
};

export const SPRING_FLIP: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 24,
  mass: 0.7,
};
