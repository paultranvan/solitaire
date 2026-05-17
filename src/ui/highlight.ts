import { Move } from '@/game/moves';

export type HintHighlight =
  | { kind: 'tableauTop'; column: number }
  | { kind: 'tableauStack'; column: number; cardIndex: number }
  | { kind: 'tableauColumn'; column: number }
  | { kind: 'talon' }
  | { kind: 'stock' }
  | { kind: 'foundation'; idx: number };

export type HintState = {
  source: HintHighlight;
  target: HintHighlight;
} | null;

export const moveToHint = (move: Move): HintState => {
  switch (move.kind) {
    case 'tableauToTableau':
      return {
        source: { kind: 'tableauStack', column: move.from, cardIndex: move.cardIndex },
        target: { kind: 'tableauColumn', column: move.to },
      };
    case 'tableauToFoundation':
      return {
        source: { kind: 'tableauTop', column: move.from },
        target: { kind: 'foundation', idx: move.foundationIdx },
      };
    case 'talonToTableau':
      return {
        source: { kind: 'talon' },
        target: { kind: 'tableauColumn', column: move.to },
      };
    case 'talonToFoundation':
      return {
        source: { kind: 'talon' },
        target: { kind: 'foundation', idx: move.foundationIdx },
      };
    case 'foundationToTableau':
      return {
        source: { kind: 'foundation', idx: move.foundationIdx },
        target: { kind: 'tableauColumn', column: move.to },
      };
    // Draw / recycle have no card-level source or target — pulse the stock
    // pile so "press Hint, nothing happens" becomes "press Hint, draw a card".
    case 'draw':
    case 'recycle':
      return {
        source: { kind: 'stock' },
        target: { kind: 'stock' },
      };
  }
};

const matches = (h: HintHighlight, q: HintHighlight): boolean => {
  if (h.kind !== q.kind) return false;
  switch (h.kind) {
    case 'tableauTop':
      return h.column === (q as { column: number }).column;
    case 'tableauStack':
      return (
        h.column === (q as { column: number }).column &&
        h.cardIndex === (q as { cardIndex: number }).cardIndex
      );
    case 'tableauColumn':
      return h.column === (q as { column: number }).column;
    case 'talon':
    case 'stock':
      return true;
    case 'foundation':
      return h.idx === (q as { idx: number }).idx;
  }
};

export const isHintSource = (h: HintState, q: HintHighlight): boolean =>
  h !== null && matches(h.source, q);
export const isHintTarget = (h: HintState, q: HintHighlight): boolean =>
  h !== null && matches(h.target, q);
