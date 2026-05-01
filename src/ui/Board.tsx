import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  CollisionDetection,
} from '@dnd-kit/core';
import { Card } from '@/game/card';
import { canApply } from '@/game/canApply';
import { Move } from '@/game/moves';
import { GameState } from '@/game/state';
import { bestNextMove } from '@/game/hints';
import { findAutoMoveTarget, AutoMoveSource, nextAutoCompleteMove } from '@/game/auto';
import { isAutoCompletable, isWon } from '@/game/rules';
import { dealKlondike } from '@/game/deck';
import { DragData } from '@/dnd/types';
import { resolveMove } from '@/dnd/resolveMove';
import { gameReducer } from '@/store/gameReducer';
import { useGameAutosave } from '@/persistence/gameAutosave';
import { useStatsStore } from '@/store/statsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { HintState, moveToHint } from './hints';
import { DragLayer } from './DragLayer';
import { Foundations } from './Foundations';
import { StockTalon } from './StockTalon';
import { Tableau } from './Tableau';
import { TopBar } from './TopBar';
import './Board.css';

const HINT_DURATION_MS = 1600;
const AUTOCOMPLETE_STEP_MS = 80;

// pointerWithin handles cards with negative margins better than rectIntersection
// (which would otherwise prefer the source column). Fall back to closestCenter
// when the pointer is in a gap between piles so drags still complete cleanly.
const collision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

export function Board({ initial }: { initial: GameState }) {
  const [state, dispatch] = useReducer(gameReducer, initial);
  const [activeCards, setActiveCards] = useState<Card[] | null>(null);
  const [hint, setHint] = useState<HintState>(null);
  const [, setTick] = useState(0);
  const wonReportedRef = useRef(false);

  const recordGame = useStatsStore((s) => s.recordGame);
  const settingsDrawCount = useSettingsStore((s) => s.settings.drawCount);

  useGameAutosave(state);

  // Record win exactly once per game.
  useEffect(() => {
    if (!isWon(state)) return;
    if (wonReportedRef.current) return;
    wonReportedRef.current = true;
    recordGame({
      mode: state.drawCount,
      outcome: 'won',
      durationSec: Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)),
      moves: state.movesMade,
    });
  }, [state, recordGame]);

  useEffect(() => {
    if (isWon(state)) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (isWon(state)) return;
    if (!isAutoCompletable(state)) return;
    const move = nextAutoCompleteMove(state);
    if (move === null) return;
    const id = setTimeout(() => dispatch({ type: 'move', move }), AUTOCOMPLETE_STEP_MS);
    return () => clearTimeout(id);
  }, [state]);

  useEffect(() => {
    if (hint === null) return;
    const id = setTimeout(() => setHint(null), HINT_DURATION_MS);
    return () => clearTimeout(id);
  }, [hint]);

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
    setHint(null);
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

  const handleAutoMove = useCallback(
    (source: AutoMoveSource) => {
      const move = findAutoMoveTarget(state, source);
      if (move === null) return;
      if (!canApply(state, move)) return;
      dispatch({ type: 'move', move });
    },
    [state],
  );

  const handleUndo = () => dispatch({ type: 'undo' });

  const handleHint = () => {
    const move = bestNextMove(state);
    if (move === null) return;
    setHint(moveToHint(move));
  };

  const handleNewGame = () => {
    // Count abandoned game if there were moves but it wasn't won.
    if (state.movesMade > 0 && !isWon(state) && !wonReportedRef.current) {
      recordGame({
        mode: state.drawCount,
        outcome: 'abandoned',
        durationSec: Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)),
        moves: state.movesMade,
      });
    }
    wonReportedRef.current = false;
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { tableau, stock } = dealKlondike(seed);
    dispatch({
      type: 'reset',
      state: {
        schemaVersion: 1,
        tableau,
        stock,
        talon: [],
        foundations: [[], [], [], []],
        drawCount: settingsDrawCount,
        startedAt: Date.now(),
        movesMade: 0,
        redealCount: 0,
        seed,
        history: [],
      },
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCards(null)}
    >
      <div className="board">
        <TopBar
          elapsedSec={elapsedSec}
          moves={state.movesMade}
          canUndo={state.history.length > 0}
          onUndo={handleUndo}
          onHint={handleHint}
          onNewGame={handleNewGame}
        />
        <div className="board__top">
          <StockTalon
            stock={state.stock}
            talon={state.talon}
            onStockClick={handleStockClick}
            onTalonAutoMove={() => handleAutoMove({ kind: 'talon' })}
            hint={hint}
          />
          <Foundations piles={state.foundations} hint={hint} />
        </div>
        <Tableau columns={state.tableau} hint={hint} onAutoMove={handleAutoMove} />
        <DragLayer cards={activeCards} />
      </div>
    </DndContext>
  );
}
