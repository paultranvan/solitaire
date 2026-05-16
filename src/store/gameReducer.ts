import { applyMove, InvalidMoveError, Move, undo as undoState } from '@/game/moves';
import { GameState } from '@/game/state';

export type GameAction =
  | { type: 'move'; move: Move }
  | { type: 'undo' }
  | { type: 'hint' }
  | { type: 'reset'; state: GameState }
  | { type: 'tick'; deltaMs: number };

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
    case 'hint':
      // Unlike a move, a hint doesn't push history — it only bumps the counter.
      return { ...state, hintsUsed: state.hintsUsed + 1 };
    case 'reset':
      // Defensively clear history so a stale snapshot never leaks into a fresh
      // game; createInitialState already sets history: [], but keep this so
      // any future caller can't drift.
      return { ...action.state, history: [] };
    case 'tick': {
      // Tick doesn't push history — it isn't a player move, just an
      // accumulator update for the active-play timer.
      if (action.deltaMs <= 0) return state;
      return { ...state, activeMs: state.activeMs + action.deltaMs };
    }
  }
};
