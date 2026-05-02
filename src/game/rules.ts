import { Card, color, Suit } from './card';
import { GameState } from './state';

export const foundationIdxFor = (suit: Suit): 0 | 1 | 2 | 3 => {
  switch (suit) {
    case 'h':
      return 0;
    case 'd':
      return 1;
    case 's':
      return 2;
    case 'c':
      return 3;
  }
};

export const canPlaceOnTableau = (moving: Card, target: Card | undefined): boolean => {
  if (!moving.faceUp) return false;
  if (target === undefined) return moving.rank === 13;
  if (!target.faceUp) return false;
  if (color(moving.suit) === color(target.suit)) return false;
  return moving.rank === target.rank - 1;
};

export const canPlaceOnFoundation = (moving: Card, target: Card | undefined): boolean => {
  if (!moving.faceUp) return false;
  if (target === undefined) return moving.rank === 1;
  if (moving.suit !== target.suit) return false;
  return moving.rank === target.rank + 1;
};

export const isValidStack = (cards: readonly Card[]): boolean => {
  if (cards.length === 0) return false;
  if (!cards.every((c) => c.faceUp)) return false;
  for (let i = 0; i < cards.length - 1; i++) {
    const a = cards[i];
    const b = cards[i + 1];
    if (color(a.suit) === color(b.suit)) return false;
    if (b.rank !== a.rank - 1) return false;
  }
  return true;
};

export const isWon = (s: GameState): boolean => s.foundations.every((p) => p.length === 13);

// True once the tableau has no face-down cards left. Stock and talon may
// still contain cards — the auto-complete loop will draw from stock and
// dump talon tops to the foundation as part of the resolution.
export const isAutoCompletable = (s: GameState): boolean =>
  s.tableau.every((col) => col.every((c) => c.faceUp));
