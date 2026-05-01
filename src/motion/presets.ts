import { Transition } from 'motion/react';

export const SPRING_DEFAULT: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 32,
  mass: 0.7,
};

export const SPRING_LIFT: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 22,
  mass: 0.6,
};

export const SPRING_FLIP: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 24,
  mass: 0.7,
};
