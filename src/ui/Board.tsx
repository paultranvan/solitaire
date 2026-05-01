import { useReducer, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import { Card } from '@/game/card';
import { Move } from '@/game/moves';
import { canApply } from '@/game/canApply';
import { GameState } from '@/game/state';
import { DragData } from '@/dnd/types';
import { resolveMove } from '@/dnd/resolveMove';
import { gameReducer } from '@/store/gameReducer';
import { DragLayer } from './DragLayer';
import { Foundations } from './Foundations';
import { StockTalon } from './StockTalon';
import { Tableau } from './Tableau';
import { TopBar } from './TopBar';
import './Board.css';

export function Board({ initial }: { initial: GameState }) {
  const [state, dispatch] = useReducer(gameReducer, initial);
  const [activeCards, setActiveCards] = useState<Card[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const elapsedSec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));

  const handleStockClick = () => {
    const move: Move = state.stock.length > 0 ? { kind: 'draw' } : { kind: 'recycle' };
    dispatch({ type: 'move', move });
  };

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData | undefined;
    setActiveCards(data?.cards ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCards(null);
    if (!e.over) return;
    const data = e.active.data.current as DragData | undefined;
    if (!data) return;
    const move = resolveMove(data, String(e.over.id));
    if (move === null) return;
    if (!canApply(state, move)) return;
    dispatch({ type: 'move', move });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCards(null)}
    >
      <div className="board">
        <TopBar elapsedSec={elapsedSec} moves={state.movesMade} />
        <div className="board__top">
          <StockTalon
            stock={state.stock}
            talon={state.talon}
            onStockClick={handleStockClick}
          />
          <Foundations piles={state.foundations} />
        </div>
        <Tableau columns={state.tableau} />
        <DragLayer cards={activeCards} />
      </div>
    </DndContext>
  );
}
