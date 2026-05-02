import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  CollisionDetection,
} from '@dnd-kit/core';
import { LayoutGroup } from 'motion/react';
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
import { SkipLayoutAnimProvider } from './Card';
import { DragLayer } from './DragLayer';
import { Foundations } from './Foundations';
import { StockTalon } from './StockTalon';
import { MenuSheet } from './MenuSheet';
import { Tableau } from './Tableau';
import { TopBar } from './TopBar';
import { WinSheet } from './WinSheet';
import { play, primeAudioOnFirstGesture } from '@/audio/sounds';
import { haptic } from '@/haptics/haptics';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  // Becomes true for a single render after a drag-drop dispatch, suppressing
  // the layoutId fly-from-source animation that looks wrong because the card
  // was visually at the cursor rather than in its source slot.
  const [skipLayoutAnim, setSkipLayoutAnim] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!skipLayoutAnim) return;
    setSkipLayoutAnim(false);
  }, [skipLayoutAnim]);
  const wonReportedRef = useRef(false);
  const winDurationRef = useRef(0);
  const winMovesRef = useRef(0);

  useEffect(() => {
    primeAudioOnFirstGesture();
  }, []);

  const recordGame = useStatsStore((s) => s.recordGame);
  const settingsDrawCount = useSettingsStore((s) => s.settings.drawCount);

  useGameAutosave(state);

  // Record win exactly once per game and trigger celebration.
  useEffect(() => {
    if (!isWon(state)) return;
    if (wonReportedRef.current) return;
    wonReportedRef.current = true;
    const durationSec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    winDurationRef.current = durationSec;
    winMovesRef.current = state.movesMade;
    recordGame({
      mode: state.drawCount,
      outcome: 'won',
      durationSec,
      moves: state.movesMade,
    });
    play('winCascade');
    haptic('win');
    // Slight delay so the last foundation animation finishes before the sheet covers it.
    const id = setTimeout(() => setWinOpen(true), 600);
    return () => clearTimeout(id);
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
  );

  const elapsedSec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));

  const handleStockClick = () => {
    const move: Move = state.stock.length > 0 ? { kind: 'draw' } : { kind: 'recycle' };
    dispatch({ type: 'move', move });
    play('flip');
    haptic('pickup');
  };

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData | undefined;
    setActiveCards(data?.cards ?? null);
    setHint(null);
    play('pickup');
    haptic('pickup');
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCards(null);
    if (!e.over) {
      play('dropInvalid');
      haptic('dropInvalid');
      return;
    }
    const data = e.active.data.current as DragData | undefined;
    if (!data) return;
    const move = resolveMove(data, String(e.over.id));
    if (move === null || !canApply(state, move)) {
      play('dropInvalid');
      haptic('dropInvalid');
      return;
    }
    setSkipLayoutAnim(true);
    dispatch({ type: 'move', move });
    if (move.kind === 'tableauToFoundation' || move.kind === 'talonToFoundation') {
      play('foundation');
      haptic('foundation');
    } else {
      play('dropValid');
      haptic('dropValid');
    }
  };

  const handleAutoMove = useCallback(
    (source: AutoMoveSource) => {
      const move = findAutoMoveTarget(state, source);
      if (move === null) return;
      if (!canApply(state, move)) return;
      // flushSync commits the state change synchronously so motion/react can
      // run its layout-effects and apply layoutId transforms before the
      // browser paints. Without it, multi-card moves intermittently flicker
      // because some cards paint at their destination one frame before the
      // transform pulls them back to the source for the animation.
      flushSync(() => {
        dispatch({ type: 'move', move });
      });
      if (move.kind === 'tableauToFoundation' || move.kind === 'talonToFoundation') {
        play('foundation');
        haptic('foundation');
      } else {
        play('dropValid');
        haptic('dropValid');
      }
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
          onMenu={() => setMenuOpen(true)}
        />
        {/* LayoutGroup is keyed by seed so layoutId shared-element animations
            never bridge between games (a new deal contains all 52 ids again). */}
        <LayoutGroup id={state.seed}>
          <SkipLayoutAnimProvider value={skipLayoutAnim}>
            <div className="board__main">
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
            </div>
          </SkipLayoutAnimProvider>
        </LayoutGroup>
        <DragLayer cards={activeCards} />
        <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
        <WinSheet
          open={winOpen}
          onClose={() => setWinOpen(false)}
          onPlayAgain={() => {
            setWinOpen(false);
            handleNewGame();
          }}
          durationSec={winDurationRef.current}
          moves={winMovesRef.current}
          drawCount={state.drawCount}
        />
      </div>
    </DndContext>
  );
}
