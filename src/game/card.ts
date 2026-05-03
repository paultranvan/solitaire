export type Suit = 'h' | 'd' | 's' | 'c';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
};

export const SUITS: readonly Suit[] = ['h', 'd', 's', 'c'] as const;
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export const cardId = (suit: Suit, rank: Rank): string => `${suit}${rank}`;

export const color = (suit: Suit): 'red' | 'black' =>
  suit === 'h' || suit === 'd' ? 'red' : 'black';

export const makeCard = (suit: Suit, rank: Rank, faceUp = false): Card => ({
  id: cardId(suit, rank),
  suit,
  rank,
  faceUp,
});
