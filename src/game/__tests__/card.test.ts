import { describe, expect, it } from 'vitest';
import { cardId, color, makeCard, parseCardId, RANKS, SUITS } from '../card';

describe('card', () => {
  it('SUITS and RANKS contain the canonical values', () => {
    expect(SUITS).toEqual(['h', 'd', 's', 'c']);
    expect(RANKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('cardId encodes suit + rank as a stable string', () => {
    expect(cardId('h', 7)).toBe('h7');
    expect(cardId('s', 13)).toBe('s13');
    expect(cardId('d', 1)).toBe('d1');
  });

  it('parseCardId is the inverse of cardId', () => {
    expect(parseCardId('h7')).toEqual({ suit: 'h', rank: 7 });
    expect(parseCardId('c10')).toEqual({ suit: 'c', rank: 10 });
    expect(parseCardId('s13')).toEqual({ suit: 's', rank: 13 });
  });

  it('color returns red for hearts/diamonds and black for spades/clubs', () => {
    expect(color('h')).toBe('red');
    expect(color('d')).toBe('red');
    expect(color('s')).toBe('black');
    expect(color('c')).toBe('black');
  });

  it('makeCard builds a card with the right id and faceUp default', () => {
    const c = makeCard('h', 7);
    expect(c).toEqual({ id: 'h7', suit: 'h', rank: 7, faceUp: false });
    expect(makeCard('s', 13, true).faceUp).toBe(true);
  });
});
