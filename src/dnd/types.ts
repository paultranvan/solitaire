import { Card } from '@/game/card';

export type DragSource =
  | { kind: 'tableauStack'; column: number; fromIndex: number }
  | { kind: 'talonTop' }
  | { kind: 'foundationTop'; foundationIdx: number };

export type DragData = {
  source: DragSource;
  cards: Card[];
};

// Drop-target ids are short strings, not opaque objects, because dnd-kit
// stringifies them. Keeping the format here is the single source of truth.
export const tableauColumnDropId = (col: number): string => `t:${col}`;
export const foundationDropId = (idx: number): string => `f:${idx}`;

// Drag (source) ids — same string namespace as drop ids; the cardIndex suffix
// keeps each card in a stack uniquely addressable.
export const tableauCardDragId = (col: number, cardIndex: number): string =>
  `t:${col}:${cardIndex}`;
export const foundationDragId = (idx: number): string => `f:${idx}`;
export const TALON_DRAG_ID = 'talon-top';

export type ParsedDropTarget =
  | { kind: 'tableau'; column: number }
  | { kind: 'foundation'; foundationIdx: number };

export const parseDropId = (id: string): ParsedDropTarget | null => {
  if (id.startsWith('t:')) {
    const column = Number(id.slice(2));
    return Number.isInteger(column) ? { kind: 'tableau', column } : null;
  }
  if (id.startsWith('f:')) {
    const foundationIdx = Number(id.slice(2));
    return Number.isInteger(foundationIdx) ? { kind: 'foundation', foundationIdx } : null;
  }
  return null;
};
