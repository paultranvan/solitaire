import { Move } from '@/game/moves';
import { DragData, parseDropId } from './types';

/**
 * Translate a drag source + drop target into a Move. Returns null if the
 * combination is structurally invalid (e.g., dragging a stack onto a foundation,
 * which only ever accepts a single card).
 *
 * Game-rule validity is enforced separately by applyMove — this function only
 * builds the candidate move; if it's illegal, applyMove will throw.
 */
export const resolveMove = (data: DragData, dropId: string): Move | null => {
  const target = parseDropId(dropId);
  if (target === null) return null;

  const { source, cards } = data;

  if (target.kind === 'foundation') {
    if (cards.length !== 1) return null;
    switch (source.kind) {
      case 'tableauStack':
        return {
          kind: 'tableauToFoundation',
          from: source.column,
          foundationIdx: target.foundationIdx,
        };
      case 'talonTop':
        return { kind: 'talonToFoundation', foundationIdx: target.foundationIdx };
      case 'foundationTop':
        return null;
    }
  }

  if (target.kind === 'tableau') {
    switch (source.kind) {
      case 'tableauStack':
        if (source.column === target.column) return null;
        return {
          kind: 'tableauToTableau',
          from: source.column,
          cardIndex: source.fromIndex,
          to: target.column,
        };
      case 'talonTop':
        if (cards.length !== 1) return null;
        return { kind: 'talonToTableau', to: target.column };
      case 'foundationTop':
        if (cards.length !== 1) return null;
        return {
          kind: 'foundationToTableau',
          foundationIdx: source.foundationIdx,
          to: target.column,
        };
    }
  }

  return null;
};
