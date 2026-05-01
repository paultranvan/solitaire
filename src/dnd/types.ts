import { Card } from '@/game/card';

export type DragSource =
  | { kind: 'tableauStack'; column: number; fromIndex: number }
  | { kind: 'talonTop' }
  | { kind: 'foundationTop'; foundationIdx: number };

export type DragData = {
  source: DragSource;
  cards: Card[];
};

export type DropTargetId = `t:${number}` | `f:${number}`;

export const tableauColumnDropId = (col: number): DropTargetId => `t:${col}`;
export const foundationDropId = (idx: number): DropTargetId => `f:${idx}`;

export const parseDropId = (id: string):
  | { kind: 'tableau'; column: number }
  | { kind: 'foundation'; foundationIdx: number }
  | null => {
  if (id.startsWith('t:')) return { kind: 'tableau', column: Number(id.slice(2)) };
  if (id.startsWith('f:')) return { kind: 'foundation', foundationIdx: Number(id.slice(2)) };
  return null;
};
