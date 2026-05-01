import { describe, expect, it } from 'vitest';
import { makeCard } from '@/game/card';
import { resolveMove } from '../resolveMove';

const card = makeCard('h', 7, true);

describe('resolveMove', () => {
  it('tableauStack → tableau column', () => {
    const move = resolveMove(
      { source: { kind: 'tableauStack', column: 1, fromIndex: 2 }, cards: [card, card] },
      't:3',
    );
    expect(move).toEqual({ kind: 'tableauToTableau', from: 1, cardIndex: 2, to: 3 });
  });

  it('rejects same-column tableau drop', () => {
    expect(
      resolveMove(
        { source: { kind: 'tableauStack', column: 2, fromIndex: 0 }, cards: [card] },
        't:2',
      ),
    ).toBeNull();
  });

  it('tableauStack of size 1 → foundation', () => {
    const move = resolveMove(
      { source: { kind: 'tableauStack', column: 1, fromIndex: 4 }, cards: [card] },
      'f:0',
    );
    expect(move).toEqual({ kind: 'tableauToFoundation', from: 1, foundationIdx: 0 });
  });

  it('rejects multi-card stack onto foundation', () => {
    expect(
      resolveMove(
        { source: { kind: 'tableauStack', column: 1, fromIndex: 0 }, cards: [card, card] },
        'f:0',
      ),
    ).toBeNull();
  });

  it('talonTop → tableau', () => {
    expect(resolveMove({ source: { kind: 'talonTop' }, cards: [card] }, 't:5')).toEqual({
      kind: 'talonToTableau',
      to: 5,
    });
  });

  it('talonTop → foundation', () => {
    expect(resolveMove({ source: { kind: 'talonTop' }, cards: [card] }, 'f:2')).toEqual({
      kind: 'talonToFoundation',
      foundationIdx: 2,
    });
  });

  it('foundationTop → tableau', () => {
    expect(
      resolveMove({ source: { kind: 'foundationTop', foundationIdx: 1 }, cards: [card] }, 't:0'),
    ).toEqual({ kind: 'foundationToTableau', foundationIdx: 1, to: 0 });
  });

  it('foundationTop → foundation: rejected', () => {
    expect(
      resolveMove({ source: { kind: 'foundationTop', foundationIdx: 1 }, cards: [card] }, 'f:0'),
    ).toBeNull();
  });

  it('unknown drop id returns null', () => {
    expect(resolveMove({ source: { kind: 'talonTop' }, cards: [card] }, 'banana')).toBeNull();
  });
});
