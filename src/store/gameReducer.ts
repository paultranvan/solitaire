import { applyMove, InvalidMoveError, Move, undo as undoState } from '@/game/moves';
import { GameState } from '@/game/state';

export type GameAction =
  | { type: 'move'; move: Move }
  | { type: 'undo' }
  | { type: 'reset'; state: GameState };

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'move':
      try {
        return applyMove(state, action.move);
      } catch (err) {
        if (err instanceof InvalidMoveError) return state;
        throw err;
      }
    case 'undo':
      return undoState(state);
    case 'reset':
      return action.state;
  }
};
