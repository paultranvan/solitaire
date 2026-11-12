// Verifies a finished game from first principles: re-deal from the seed, apply
// the logged moves through the same reducer the UI uses, and check the result
// is a win. This is what a leaderboard server runs on a submission, so nothing
// here trusts its input — moves are parsed from `unknown` and every rule is
// enforced by applyMove.
import { applyMove, InvalidMoveError, MAX_MOVE_LOG, Move } from './moves';
import { isAutoCompletable, isWon } from './rules';
import { createInitialState, GameState } from './state';

const TABLEAU_COLUMNS = 7;
const FOUNDATION_PILES = 4;
const DECK_SIZE = 52;

const isIndex = (v: unknown, limit: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < limit;

// Validates an untrusted value as a Move and returns a fresh object holding
// only that move's own fields, or null. Indices are range-checked here so
// applyMove never indexes outside the piles.
export const parseMove = (raw: unknown): Move | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  switch (o.kind) {
    case 'draw':
      if (o.count === undefined) return { kind: 'draw' };
      return o.count === 1 || o.count === 3 ? { kind: 'draw', count: o.count } : null;
    case 'recycle':
      return { kind: 'recycle' };
    case 'tableauToTableau':
      return isIndex(o.from, TABLEAU_COLUMNS) &&
        isIndex(o.cardIndex, DECK_SIZE) &&
        isIndex(o.to, TABLEAU_COLUMNS)
        ? { kind: 'tableauToTableau', from: o.from, cardIndex: o.cardIndex, to: o.to }
        : null;
    case 'tableauToFoundation':
      return isIndex(o.from, TABLEAU_COLUMNS) && isIndex(o.foundationIdx, FOUNDATION_PILES)
        ? { kind: 'tableauToFoundation', from: o.from, foundationIdx: o.foundationIdx }
        : null;
    case 'talonToTableau':
      return isIndex(o.to, TABLEAU_COLUMNS) ? { kind: 'talonToTableau', to: o.to } : null;
    case 'talonToFoundation':
      return isIndex(o.foundationIdx, FOUNDATION_PILES)
        ? { kind: 'talonToFoundation', foundationIdx: o.foundationIdx }
        : null;
    case 'foundationToTableau':
      return isIndex(o.foundationIdx, FOUNDATION_PILES) && isIndex(o.to, TABLEAU_COLUMNS)
        ? { kind: 'foundationToTableau', foundationIdx: o.foundationIdx, to: o.to }
        : null;
    default:
      return null;
  }
};

// Parses an untrusted move log. All-or-nothing: one bad entry (or a log longer
// than `maxMoves`) invalidates the lot, since a log with a hole can't replay.
export const parseMoveLog = (raw: unknown, maxMoves = MAX_MOVE_LOG): Move[] | null => {
  if (!Array.isArray(raw) || raw.length > maxMoves) return null;
  const moves: Move[] = [];
  for (const entry of raw) {
    const move = parseMove(entry);
    if (move === null) return null;
    moves.push(move);
  }
  return moves;
};

export type ReplayResult =
  | {
      ok: true;
      movesMade: number;
      redealCount: number;
      // Moves made before the tableau was first fully face-up. From then on
      // the app can finish the game on its own (auto-complete), so only these
      // are known to have been played by hand — which is what a plausibility
      // check on the claimed duration should be based on.
      manualMoves: number;
    }
  // `index` is the offending move's position in the log.
  | { ok: false; reason: 'illegal-move'; index: number }
  | { ok: false; reason: 'not-won' };

// A draw may override the game's draw count only the way the app itself does:
// the auto-complete loop draws one card at a time, and it only ever runs once
// the tableau is fully face-up. Anything else (e.g. single draws throughout a
// draw-3 game) would be an easier game than the one being claimed.
const isLegalDrawCount = (move: Move, drawCount: 1 | 3, state: GameState): boolean =>
  move.kind !== 'draw' ||
  move.count === undefined ||
  move.count === drawCount ||
  (move.count === 1 && isAutoCompletable(state));

export const replayGame = (game: {
  seed: string;
  drawCount: 1 | 3;
  moves: readonly Move[];
}): ReplayResult => {
  let state = createInitialState({ drawCount: game.drawCount, seed: game.seed });
  // A replay never undoes and never needs its own log; dropping both keeps
  // each step O(deck) instead of copying ever-longer arrays.
  state.moveLog = null;
  let manualMoves: number | null = null;
  for (let index = 0; index < game.moves.length; index++) {
    const move = game.moves[index];
    if (manualMoves === null && isAutoCompletable(state)) manualMoves = index;
    if (!isLegalDrawCount(move, game.drawCount, state)) {
      return { ok: false, reason: 'illegal-move', index };
    }
    try {
      state = applyMove(state, move);
    } catch (err) {
      if (err instanceof InvalidMoveError) return { ok: false, reason: 'illegal-move', index };
      throw err;
    }
    state.history = [];
  }
  if (!isWon(state)) return { ok: false, reason: 'not-won' };
  return {
    ok: true,
    movesMade: state.movesMade,
    redealCount: state.redealCount,
    manualMoves: manualMoves ?? game.moves.length,
  };
};
