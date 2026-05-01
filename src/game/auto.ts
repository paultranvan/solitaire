import { Card } from './card';
import { Move } from './moves';
import { canPlaceOnFoundation, canPlaceOnTableau, foundationIdxFor } from './rules';
import { GameState } from './state';

export type AutoMoveSource =
  | { kind: 'talon' }
  | { kind: 'tableauTop'; column: number };

const tryFoundationFor = (card: Card, foundations: readonly Card[][]): number | null => {
  const idx = foundationIdxFor(card.suit);
  const top = foundations[idx][foundations[idx].length - 1];
  return canPlaceOnFoundation(card, top) ? idx : null;
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
  if (col.length === 0) return null;
  const top = col[col.length - 1];
  if (!top.faceUp) return null;

  const fnd = tryFoundationFor(top, state.foundations);
  if (fnd !== null) {
    return { kind: 'tableauToFoundation', from: source.column, foundationIdx: fnd };
  }

  let best: { to: number; score: number } | null = null;
  for (let to = 0; to < 7; to++) {
    if (to === source.column) continue;
    const dst = state.tableau[to];
    const dstTop = dst[dst.length - 1];
    if (canPlaceOnTableau(top, dstTop)) {
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
    cardIndex: col.length - 1,
    to: best.to,
  };
};

export const nextAutoCompleteMove = (state: GameState): Move | null => {
  for (let from = 0; from < 7; from++) {
    const col = state.tableau[from];
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    if (!top.faceUp) continue;
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'tableauToFoundation', from, foundationIdx: idx };
  }
  return null;
};
