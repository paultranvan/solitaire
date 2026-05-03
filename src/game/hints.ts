import { Move } from './moves';
import { canPlaceOnTableau, findFoundationFor, isValidStack } from './rules';
import { GameState } from './state';

export const bestNextMove = (state: GameState): Move | null => {
  if (state.talon.length > 0) {
    const top = state.talon[state.talon.length - 1];
    const idx = findFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'talonToFoundation', foundationIdx: idx };
  }

  for (let from = 0; from < state.tableau.length; from++) {
    const col = state.tableau[from];
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    if (!top.faceUp) continue;
    const idx = findFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'tableauToFoundation', from, foundationIdx: idx };
  }

  for (let from = 0; from < state.tableau.length; from++) {
    const col = state.tableau[from];
    const firstFaceUp = col.findIndex((c) => c.faceUp);
    if (firstFaceUp <= 0) continue;
    const stack = col.slice(firstFaceUp);
    if (!isValidStack(stack)) continue;
    for (let to = 0; to < state.tableau.length; to++) {
      if (to === from) continue;
      const dst = state.tableau[to];
      if (canPlaceOnTableau(stack[0], dst[dst.length - 1])) {
        return { kind: 'tableauToTableau', from, cardIndex: firstFaceUp, to };
      }
    }
  }

  if (state.talon.length > 0) {
    const top = state.talon[state.talon.length - 1];
    for (let to = 0; to < state.tableau.length; to++) {
      const dst = state.tableau[to];
      if (canPlaceOnTableau(top, dst[dst.length - 1])) return { kind: 'talonToTableau', to };
    }
  }

  return null;
};
