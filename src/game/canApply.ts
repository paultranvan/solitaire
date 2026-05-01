import { applyMove, InvalidMoveError, Move } from './moves';
import { GameState } from './state';

/**
 * Pre-flight check for a move. Returns true if applyMove(state, move) would not
 * throw. Used by the UI to decide whether to commit a drop, and to highlight
 * legal targets without dispatching.
 */
export const canApply = (state: GameState, move: Move): boolean => {
  try {
    applyMove(state, move);
    return true;
  } catch (err) {
    if (err instanceof InvalidMoveError) return false;
    throw err;
  }
};
