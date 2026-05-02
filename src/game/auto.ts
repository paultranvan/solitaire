import { Card } from './card';
import { Move } from './moves';
import { canPlaceOnFoundation, canPlaceOnTableau } from './rules';
import { GameState } from './state';

export type AutoMoveSource =
  | { kind: 'talon' }
  | { kind: 'tableauStack'; column: number; cardIndex: number };

// Foundations have no fixed suit assignment in classic Klondike — any Ace can
// start any pile, and the player decides where each suit lands. Scan all four
// piles in order and return the first one that accepts the card. The empty
// pile suit indicators in the UI are decorative, not constraints.
const tryFoundationFor = (card: Card, foundations: readonly Card[][]): number | null => {
  for (let idx = 0; idx < foundations.length; idx++) {
    const top = foundations[idx][foundations[idx].length - 1];
    if (canPlaceOnFoundation(card, top)) return idx;
  }
  return null;
};

const countFaceDownInColumn = (col: readonly Card[]): number =>
  col.reduce((n, c) => (c.faceUp ? n : n + 1), 0);

export const findAutoMoveTarget = (state: GameState, source: AutoMoveSource): Move | null => {
  if (source.kind === 'talon') {
    if (state.talon.length === 0) return null;
    const card = state.talon[state.talon.length - 1];
    const fnd = tryFoundationFor(card, state.foundations);
    if (fnd !== null) return { kind: 'talonToFoundation', foundationIdx: fnd };
    for (let to = 0; to < 7; to++) {
      const dst = state.tableau[to];
      const dstTop = dst[dst.length - 1];
      if (canPlaceOnTableau(card, dstTop)) return { kind: 'talonToTableau', to };
    }
    return null;
  }

  const col = state.tableau[source.column];
  if (source.cardIndex < 0 || source.cardIndex >= col.length) return null;
  const head = col[source.cardIndex];
  if (!head.faceUp) return null;
  const isSingleCard = source.cardIndex === col.length - 1;

  // Foundation accepts a single card only — try it for top-of-column clicks.
  if (isSingleCard) {
    const fnd = tryFoundationFor(head, state.foundations);
    if (fnd !== null) {
      return { kind: 'tableauToFoundation', from: source.column, foundationIdx: fnd };
    }
  }

  let best: { to: number; score: number } | null = null;
  for (let to = 0; to < 7; to++) {
    if (to === source.column) continue;
    const dst = state.tableau[to];
    const dstTop = dst[dst.length - 1];
    if (canPlaceOnTableau(head, dstTop)) {
      const score = countFaceDownInColumn(dst);
      if (best === null || score > best.score) {
        best = { to, score };
      }
    }
  }
  if (best === null) return null;
  return {
    kind: 'tableauToTableau',
    from: source.column,
    cardIndex: source.cardIndex,
    to: best.to,
  };
};

// Step the auto-complete loop: prefer foundation moves (tableau or talon),
// otherwise draw from the stock so a future iteration may unblock a move.
// Returns null when nothing more can be done automatically.
export const nextAutoCompleteMove = (state: GameState): Move | null => {
  for (let from = 0; from < 7; from++) {
    const col = state.tableau[from];
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    if (!top.faceUp) continue;
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'tableauToFoundation', from, foundationIdx: idx };
  }
  if (state.talon.length > 0) {
    const top = state.talon[state.talon.length - 1];
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'talonToFoundation', foundationIdx: idx };
  }
  if (state.stock.length > 0) return { kind: 'draw' };
  return null;
};
