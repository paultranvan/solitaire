import { Move } from './moves';
import { canPlaceOnFoundation, canPlaceOnTableau, isValidStack } from './rules';
import { GameState } from './state';

// Predicate form of applyMove — answers "would applyMove succeed?" without
// allocating a clone. Same rules, no state mutation, no history copy. Stays
// in lock-step with the cases in moves.applyMove.
export const canApply = (state: GameState, move: Move): boolean => {
  switch (move.kind) {
    case 'draw':
      return state.stock.length > 0;

    case 'recycle':
      return state.stock.length === 0 && state.talon.length > 0;

    case 'tableauToTableau': {
      if (move.from === move.to) return false;
      const src = state.tableau[move.from];
      if (!src || move.cardIndex < 0 || move.cardIndex >= src.length) return false;
      const stack = src.slice(move.cardIndex);
      if (!isValidStack(stack)) return false;
      const dst = state.tableau[move.to];
      if (!dst) return false;
      return canPlaceOnTableau(stack[0], dst[dst.length - 1]);
    }

    case 'tableauToFoundation': {
      const src = state.tableau[move.from];
      if (!src || src.length === 0) return false;
      const fnd = state.foundations[move.foundationIdx];
      if (!fnd) return false;
      return canPlaceOnFoundation(src[src.length - 1], fnd[fnd.length - 1]);
    }

    case 'talonToTableau': {
      if (state.talon.length === 0) return false;
      const dst = state.tableau[move.to];
      if (!dst) return false;
      return canPlaceOnTableau(state.talon[state.talon.length - 1], dst[dst.length - 1]);
    }

    case 'talonToFoundation': {
      if (state.talon.length === 0) return false;
      const fnd = state.foundations[move.foundationIdx];
      if (!fnd) return false;
      return canPlaceOnFoundation(state.talon[state.talon.length - 1], fnd[fnd.length - 1]);
    }

    case 'foundationToTableau': {
      const fnd = state.foundations[move.foundationIdx];
      if (!fnd || fnd.length === 0) return false;
      const dst = state.tableau[move.to];
      if (!dst) return false;
      return canPlaceOnTableau(fnd[fnd.length - 1], dst[dst.length - 1]);
    }
  }
};
