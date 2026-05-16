import { Card } from './card';
import { canPlaceOnFoundation, canPlaceOnTableau, isValidStack } from './rules';
import { GameState } from './state';

export type Move =
  | { kind: 'draw' }
  | { kind: 'recycle' }
  | { kind: 'tableauToTableau'; from: number; cardIndex: number; to: number }
  | { kind: 'tableauToFoundation'; from: number; foundationIdx: number }
  | { kind: 'talonToTableau'; to: number }
  | { kind: 'talonToFoundation'; foundationIdx: number }
  | { kind: 'foundationToTableau'; foundationIdx: number; to: number };

export class InvalidMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoveError';
  }
}

const HISTORY_CAP = 200;

const cloneState = (s: GameState): GameState => ({
  ...s,
  tableau: s.tableau.map((c) => c.slice()),
  foundations: s.foundations.map((p) => p.slice()),
  stock: s.stock.slice(),
  talon: s.talon.slice(),
  history: [],
});

const pushHistory = (next: GameState, prior: GameState): void => {
  const snapshot = cloneState(prior);
  next.history = [...prior.history, snapshot].slice(-HISTORY_CAP);
};

const autoFlipTop = (col: Card[]): void => {
  if (col.length === 0) return;
  const top = col[col.length - 1];
  if (!top.faceUp) col[col.length - 1] = { ...top, faceUp: true };
};

export const applyMove = (state: GameState, move: Move): GameState => {
  const next = cloneState(state);

  switch (move.kind) {
    case 'draw': {
      if (state.stock.length === 0) throw new InvalidMoveError('cannot draw: stock empty');
      const count = Math.min(state.drawCount, state.stock.length);
      const drawn = next.stock.splice(next.stock.length - count, count);
      for (let i = drawn.length - 1; i >= 0; i--) {
        next.talon.push({ ...drawn[i], faceUp: true });
      }
      break;
    }

    case 'recycle': {
      if (state.stock.length !== 0) throw new InvalidMoveError('cannot recycle: stock not empty');
      next.stock = next.talon
        .slice()
        .reverse()
        .map((c) => ({ ...c, faceUp: false }));
      next.talon = [];
      next.redealCount += 1;
      break;
    }

    case 'tableauToTableau': {
      if (move.from === move.to) throw new InvalidMoveError('from === to');
      const src = next.tableau[move.from];
      if (move.cardIndex < 0 || move.cardIndex >= src.length) {
        throw new InvalidMoveError('cardIndex out of range');
      }
      const stack = src.slice(move.cardIndex);
      if (!isValidStack(stack)) throw new InvalidMoveError('invalid tableau stack');
      const dst = next.tableau[move.to];
      const dstTop = dst[dst.length - 1];
      if (!canPlaceOnTableau(stack[0], dstTop)) {
        throw new InvalidMoveError('illegal tableau placement');
      }
      next.tableau[move.from] = src.slice(0, move.cardIndex);
      next.tableau[move.to] = [...dst, ...stack];
      autoFlipTop(next.tableau[move.from]);
      break;
    }

    case 'tableauToFoundation': {
      const src = next.tableau[move.from];
      if (src.length === 0) throw new InvalidMoveError('source column empty');
      const card = src[src.length - 1];
      const fnd = next.foundations[move.foundationIdx];
      const fndTop = fnd[fnd.length - 1];
      if (!canPlaceOnFoundation(card, fndTop)) {
        throw new InvalidMoveError('illegal foundation placement');
      }
      next.tableau[move.from] = src.slice(0, -1);
      next.foundations[move.foundationIdx] = [...fnd, card];
      autoFlipTop(next.tableau[move.from]);
      break;
    }

    case 'talonToTableau': {
      if (state.talon.length === 0) throw new InvalidMoveError('talon empty');
      const card = next.talon[next.talon.length - 1];
      const dst = next.tableau[move.to];
      const dstTop = dst[dst.length - 1];
      if (!canPlaceOnTableau(card, dstTop)) {
        throw new InvalidMoveError('illegal tableau placement');
      }
      next.talon = next.talon.slice(0, -1);
      next.tableau[move.to] = [...dst, card];
      break;
    }

    case 'talonToFoundation': {
      if (state.talon.length === 0) throw new InvalidMoveError('talon empty');
      const card = next.talon[next.talon.length - 1];
      const fnd = next.foundations[move.foundationIdx];
      const fndTop = fnd[fnd.length - 1];
      if (!canPlaceOnFoundation(card, fndTop)) {
        throw new InvalidMoveError('illegal foundation placement');
      }
      next.talon = next.talon.slice(0, -1);
      next.foundations[move.foundationIdx] = [...fnd, card];
      break;
    }

    case 'foundationToTableau': {
      const fnd = next.foundations[move.foundationIdx];
      if (fnd.length === 0) throw new InvalidMoveError('foundation empty');
      const card = fnd[fnd.length - 1];
      const dst = next.tableau[move.to];
      const dstTop = dst[dst.length - 1];
      if (!canPlaceOnTableau(card, dstTop)) {
        throw new InvalidMoveError('illegal tableau placement');
      }
      next.foundations[move.foundationIdx] = fnd.slice(0, -1);
      next.tableau[move.to] = [...dst, card];
      break;
    }

    default: {
      const _exhaustive: never = move;
      throw new InvalidMoveError(`unhandled move kind: ${JSON.stringify(_exhaustive)}`);
    }
  }

  pushHistory(next, state);
  next.movesMade = state.movesMade + 1;
  return next;
};

export const undo = (state: GameState): GameState => {
  if (state.history.length === 0) return state;
  const prior = state.history[state.history.length - 1];
  return {
    ...prior,
    history: state.history.slice(0, -1),
    // Carry the assistance counters forward — the popped snapshot holds stale,
    // lower values, but undosUsed / hintsUsed are monotonic for the game.
    undosUsed: state.undosUsed + 1,
    hintsUsed: state.hintsUsed,
  };
};
