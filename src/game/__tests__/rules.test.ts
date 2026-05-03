import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  findFoundationFor,
  isAutoCompletable,
  isValidStack,
  isWon,
} from '../rules';
import { blankGameState as blank, fu } from '@/test-utils/factories';

describe('canPlaceOnTableau', () => {
  it('allows K on an empty column', () => {
    expect(canPlaceOnTableau(fu('s', 13), undefined)).toBe(true);
    expect(canPlaceOnTableau(fu('h', 13), undefined)).toBe(true);
  });
  it('rejects non-K on an empty column', () => {
    expect(canPlaceOnTableau(fu('s', 12), undefined)).toBe(false);
  });
  it('allows alternating-color, one-rank-lower placement', () => {
    expect(canPlaceOnTableau(fu('h', 6), fu('s', 7))).toBe(true);
    expect(canPlaceOnTableau(fu('s', 6), fu('d', 7))).toBe(true);
  });
  it('rejects same color', () => {
    expect(canPlaceOnTableau(fu('h', 6), fu('d', 7))).toBe(false);
    expect(canPlaceOnTableau(fu('s', 6), fu('c', 7))).toBe(false);
  });
  it('rejects wrong rank', () => {
    expect(canPlaceOnTableau(fu('h', 5), fu('s', 7))).toBe(false);
    expect(canPlaceOnTableau(fu('h', 7), fu('s', 7))).toBe(false);
  });
  it('rejects placing on a face-down card', () => {
    expect(canPlaceOnTableau(fu('h', 6), makeCard('s', 7, false))).toBe(false);
  });
});

describe('canPlaceOnFoundation', () => {
  it('allows A on empty foundation', () => {
    expect(canPlaceOnFoundation(fu('h', 1), undefined)).toBe(true);
  });
  it('rejects non-A on empty foundation', () => {
    expect(canPlaceOnFoundation(fu('h', 2), undefined)).toBe(false);
  });
  it('allows next ascending same-suit', () => {
    expect(canPlaceOnFoundation(fu('h', 5), fu('h', 4))).toBe(true);
    expect(canPlaceOnFoundation(fu('s', 13), fu('s', 12))).toBe(true);
  });
  it('rejects different suit', () => {
    expect(canPlaceOnFoundation(fu('h', 5), fu('d', 4))).toBe(false);
  });
  it('rejects wrong rank', () => {
    expect(canPlaceOnFoundation(fu('h', 6), fu('h', 4))).toBe(false);
  });
});

describe('isValidStack', () => {
  it('accepts a single face-up card', () => {
    expect(isValidStack([fu('h', 7)])).toBe(true);
  });
  it('accepts descending alternating-color sequence', () => {
    expect(isValidStack([fu('s', 7), fu('h', 6), fu('c', 5)])).toBe(true);
  });
  it('rejects same-color adjacent', () => {
    expect(isValidStack([fu('s', 7), fu('c', 6)])).toBe(false);
  });
  it('rejects wrong rank order', () => {
    expect(isValidStack([fu('s', 7), fu('h', 5)])).toBe(false);
  });
  it('rejects any face-down card', () => {
    expect(isValidStack([fu('s', 7), makeCard('h', 6, false)])).toBe(false);
  });
});

describe('findFoundationFor', () => {
  it('returns the first pile that legally accepts the card', () => {
    const ace = fu('h', 1);
    expect(findFoundationFor(ace, [[], [], [], []])).toBe(0);
    expect(findFoundationFor(ace, [[fu('s', 1)], [], [], []])).toBe(1);
  });
  it('returns the matching-suit pile when the card is a follow-up', () => {
    const piles = [[fu('s', 1)], [fu('h', 1)], [], []];
    expect(findFoundationFor(fu('h', 2), piles)).toBe(1);
  });
  it('returns null when no foundation accepts the card', () => {
    expect(findFoundationFor(fu('h', 5), [[], [], [], []])).toBe(null);
    expect(findFoundationFor(fu('h', 5), [[fu('h', 1)], [], [], []])).toBe(null);
  });
});

describe('isWon / isAutoCompletable', () => {
  it('isWon true when all 4 foundations are full', () => {
    const s = blank();
    s.foundations = [
      Array.from({ length: 13 }, (_, i) => fu('h', i + 1)),
      Array.from({ length: 13 }, (_, i) => fu('d', i + 1)),
      Array.from({ length: 13 }, (_, i) => fu('s', i + 1)),
      Array.from({ length: 13 }, (_, i) => fu('c', i + 1)),
    ];
    expect(isWon(s)).toBe(true);
  });
  it('isWon false otherwise', () => {
    expect(isWon(blank())).toBe(false);
  });
  it('isAutoCompletable when no face-down cards remain in the tableau', () => {
    const s = blank();
    s.tableau[0] = [fu('h', 7)];
    s.tableau[1] = [fu('s', 13), fu('h', 12)];
    expect(isAutoCompletable(s)).toBe(true);
  });
  it('isAutoCompletable false when any tableau card is face-down', () => {
    const s = blank();
    s.tableau[0] = [makeCard('h', 7, false)];
    expect(isAutoCompletable(s)).toBe(false);
  });
  it('isAutoCompletable still true when stock or talon have cards (tableau is the gate)', () => {
    const s = blank();
    s.tableau[0] = [fu('h', 7)];
    s.stock = [makeCard('s', 1, false)];
    s.talon = [fu('d', 5)];
    expect(isAutoCompletable(s)).toBe(true);
  });
});
