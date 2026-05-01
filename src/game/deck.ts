import seedrandom from 'seedrandom';
import { Card, makeCard, RANKS, SUITS } from './card';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(suit, rank, false));
    }
  }
  return deck;
};

export const shuffleDeck = (deck: readonly Card[], seed: string): Card[] => {
  const rng = seedrandom(seed);
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const dealKlondike = (seed: string): { tableau: Card[][]; stock: Card[] } => {
  const shuffled = shuffleDeck(createDeck(), seed);
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  let cursor = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const isTop = row === col;
      const c = shuffled[cursor++];
      tableau[col].push({ ...c, faceUp: isTop });
    }
  }
  const stock = shuffled.slice(cursor).map((c) => ({ ...c, faceUp: false }));
  return { tableau, stock };
};
