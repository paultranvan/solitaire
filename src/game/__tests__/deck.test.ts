import { describe, expect, it } from 'vitest';
import { createDeck, dealKlondike, shuffleDeck } from '../deck';

describe('deck', () => {
  it('createDeck returns 52 unique cards, all face-down', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);
    expect(deck.every((c) => c.faceUp === false)).toBe(true);
  });

  it('shuffleDeck with the same seed is deterministic', () => {
    const a = shuffleDeck(createDeck(), 'seed-1');
    const b = shuffleDeck(createDeck(), 'seed-1');
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('shuffleDeck with different seeds produces different orders', () => {
    const a = shuffleDeck(createDeck(), 'alpha');
    const b = shuffleDeck(createDeck(), 'beta');
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });

  it('shuffleDeck does not mutate input and preserves the multiset', () => {
    const input = createDeck();
    const inputIds = input.map((c) => c.id);
    const shuffled = shuffleDeck(input, 'x');
    expect(input.map((c) => c.id)).toEqual(inputIds);
    expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set(inputIds));
  });

  it('dealKlondike produces 7 columns of length 1..7 and a 24-card stock', () => {
    const { tableau, stock } = dealKlondike('seed-x');
    expect(tableau).toHaveLength(7);
    tableau.forEach((col, i) => expect(col).toHaveLength(i + 1));
    expect(stock).toHaveLength(24);
  });

  it('dealKlondike face-up rule: only the top card of each tableau column is faceUp', () => {
    const { tableau } = dealKlondike('seed-x');
    tableau.forEach((col) => {
      col.forEach((card, idx) => {
        const isTop = idx === col.length - 1;
        expect(card.faceUp).toBe(isTop);
      });
    });
  });

  it('dealKlondike stock cards are all face-down', () => {
    const { stock } = dealKlondike('seed-x');
    expect(stock.every((c) => c.faceUp === false)).toBe(true);
  });

  it('dealKlondike uses all 52 cards exactly once', () => {
    const { tableau, stock } = dealKlondike('seed-x');
    const all = [...stock, ...tableau.flat()];
    expect(all).toHaveLength(52);
    expect(new Set(all.map((c) => c.id)).size).toBe(52);
  });
});
