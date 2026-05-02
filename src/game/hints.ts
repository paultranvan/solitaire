import { Card } from './card';
import { Move } from './moves';
import { canPlaceOnFoundation, canPlaceOnTableau, isValidStack } from './rules';
import { GameState } from './state';

// See note in auto.ts — foundations are not pre-assigned to suits, so scan all
// piles to find one that accepts the card.
const tryFoundationFor = (card: Card, foundations: readonly Card[][]): number | null => {
  for (let idx = 0; idx < foundations.length; idx++) {
    const top = foundations[idx][foundations[idx].length - 1];
    if (canPlaceOnFoundation(card, top)) return idx;
  }
  return null;
};

export const bestNextMove = (state: GameState): Move | null => {
  if (state.talon.length > 0) {
    const top = state.talon[state.talon.length - 1];
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'talonToFoundation', foundationIdx: idx };
  }

  for (let from = 0; from < 7; from++) {
    const col = state.tableau[from];
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    if (!top.faceUp) continue;
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'tableauToFoundation', from, foundationIdx: idx };
  }

  for (let from = 0; from < 7; from++) {
    const col = state.tableau[from];
    const firstFaceUp = col.findIndex((c) => c.faceUp);
    if (firstFaceUp <= 0) continue;
    const stack = col.slice(firstFaceUp);
    if (!isValidStack(stack)) continue;
    for (let to = 0; to < 7; to++) {
      if (to === from) continue;
      const dst = state.tableau[to];
      const dstTop = dst[dst.length - 1];
      if (canPlaceOnTableau(stack[0], dstTop)) {
        return { kind: 'tableauToTableau', from, cardIndex: firstFaceUp, to };
      }
    }
  }

  if (state.talon.length > 0) {
    const top = state.talon[state.talon.length - 1];
    for (let to = 0; to < 7; to++) {
      const dst = state.tableau[to];
      const dstTop = dst[dst.length - 1];
      if (canPlaceOnTableau(top, dstTop)) {
        return { kind: 'talonToTableau', to };
      }
    }
  }

  return null;
};
