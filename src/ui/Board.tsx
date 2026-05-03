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
import { Card, makeCard, RANKS, SUITS } from '@/game/card';
import { canApply } from '@/game/canApply';
import { Move } from '@/game/moves';
import { GameState } from '@/game/state';
import { bestNextMove } from '@/game/hints';
import { findAutoMoveTarget, AutoMoveSource, nextAutoCompleteMove } from '@/game/auto';
import { isAutoCompletable, isWon } from '@/game/rules';
import { computeScore } from '@/game/score';
import { createInitialState } from '@/game/state';
import { DragData } from '@/dnd/types';
import { resolveMove } from '@/dnd/resolveMove';
import { gameReducer } from '@/store/gameReducer';
import { useGameAutosave } from '@/persistence/gameAutosave';
import { useStatsStore } from '@/store/statsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { HintState, moveToHint } from './highlight';
import { SkipLayoutAnimProvider } from './Card';
import { DragLayer } from './DragLayer';
import { Foundations } from './Foundations';
import { StockTalon } from './StockTalon';
import { MenuSheet } from './MenuSheet';
import { Tableau } from './Tableau';
import { TopBar } from './TopBar';
import { WinSheet } from './WinSheet';
import { AutoCompleteSheet } from './AutoCompleteSheet';
import { play, primeAudioOnFirstGesture } from '@/audio/sounds';
import { haptic } from '@/haptics/haptics';
import { feedback, feedbackForMove } from './feedback';
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
  // After a drop, the card was visually at the cursor (not its source slot),
  // so the layoutId fly-from-source animation looks wrong. We suppress it for
  // the *one render* whose move count we record here. Derived, no effect bounce.
  const [skipForMoves, setSkipForMoves] = useState<number | null>(null);
  const skipLayoutAnim = skipForMoves === state.movesMade;
  // Auto-complete state machine: 'idle' until the tableau has no face-down
  // cards, 'prompt' shows the confirmation sheet, 'running' steps the loop,
  // 'declined' suppresses the prompt for the rest of this game.
  const [autoCompleteState, setAutoCompleteState] = useState<
    'idle' | 'prompt' | 'running' | 'declined'
  >('idle');
  const wonReportedRef = useRef(false);
  const winDurationRef = useRef(0);
  const winMovesRef = useRef(0);
  const winScoreRef = useRef(0);
  const winIsNewBestRef = useRef(false);
  // True when the current win came from the "win" cheat key sequence — skip
  // stats recording and the new-best badge so the preview leaves no trace.
  const cheatWinRef = useRef(false);
  // Holds the pending WinSheet open timer so handleNewGame/handleRestart can
  // cancel it. Survives effect re-runs (cleanup intentionally omitted).
  const winSheetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active-play timer. activeSinceRef holds the ms-epoch when the current
  // "running" segment began (null = paused). flushActiveTime commits the
  // running segment into state.activeMs via the tick reducer; liveActiveMs
  // returns the up-to-the-moment total without committing (used when recording
  // stats). runningSince mirrors the ref into state so TopBar can re-render.
  const activeSinceRef = useRef<number | null>(null);
  const wonRef = useRef(false);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const flushActiveTime = useCallback(() => {
    const since = activeSinceRef.current;
    if (since === null) return;
    activeSinceRef.current = null;
    setRunningSince(null);
    const delta = Date.now() - since;
    if (delta > 0) dispatch({ type: 'tick', deltaMs: delta });
  }, []);
  const startActiveTime = useCallback(() => {
    if (activeSinceRef.current !== null) return;
    if (wonRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const now = Date.now();
    activeSinceRef.current = now;
    setRunningSince(now);
  }, []);
  const liveActiveMs = (): number => {
    const since = activeSinceRef.current;
    return state.activeMs + (since !== null ? Date.now() - since : 0);
  };

  useEffect(() => {
    primeAudioOnFirstGesture();
  }, []);

  // Mount-only: register visibility listeners and start the timer if eligible.
  // Reads wonRef so the listeners stay valid across won transitions without
  // having to re-register. flushActiveTime / startActiveTime are stable.
  useEffect(() => {
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible')
        startActiveTime();
      else flushActiveTime();
    };
    const onPageHide = () => flushActiveTime();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    startActiveTime();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      flushActiveTime();
    };
  }, [flushActiveTime, startActiveTime]);

  // React to won transitions: flush on win, start on new-deal-after-win/undo.
  // Cheap & idempotent on every state change (start/flush early-return when
  // already in target state), so depending on `state` is safe.
  useEffect(() => {
    const won = isWon(state);
    wonRef.current = won;
    if (won) flushActiveTime();
    else startActiveTime();
  }, [state, flushActiveTime, startActiveTime]);

  const recordGame = useStatsStore((s) => s.recordGame);
  const settingsDrawCount = useSettingsStore((s) => s.settings.drawCount);
  const autoMoveOnTap = useSettingsStore((s) => s.settings.autoMoveOnTap);
  const animationsOn = useSettingsStore((s) => s.settings.animations);
  const handedness = useSettingsStore((s) => s.settings.handedness);

  useGameAutosave(state);

  // Record win exactly once per game and trigger celebration.
  useEffect(() => {
    if (!isWon(state)) return;
    if (wonReportedRef.current) return;
    wonReportedRef.current = true;
    // Inline live-active-ms read so this effect doesn't depend on the
    // freshly-rebuilt liveActiveMs closure each render.
    const since = activeSinceRef.current;
    const liveMs = state.activeMs + (since !== null ? Date.now() - since : 0);
    const durationSec = Math.max(0, Math.floor(liveMs / 1000));
    const score = computeScore({
      durationSec,
      moves: state.movesMade,
      drawCount: state.drawCount,
    });
    const isCheat = cheatWinRef.current;
    // Read the prior best for this mode *before* recordGame mutates it so the
    // "New best!" badge reflects the comparison the player just made. Suppress
    // the badge entirely on a cheat win since the score isn't saved.
    const priorBest =
      useStatsStore.getState().stats.byMode[String(state.drawCount) as '1' | '3'].bestScore;
    winDurationRef.current = durationSec;
    winMovesRef.current = state.movesMade;
    winScoreRef.current = score;
    winIsNewBestRef.current = !isCheat && (priorBest === null || score > priorBest);
    if (!isCheat) {
      recordGame({
        mode: state.drawCount,
        outcome: 'won',
        durationSec,
        moves: state.movesMade,
        score,
      });
    }
    play('winCascade');
    haptic('win');
    // Slight delay so the last foundation animation finishes before the sheet
    // covers it. Don't return a cleanup: this effect re-runs whenever `state`
    // changes (e.g. the activeMs tick that the won-transition effect dispatches
    // immediately after the winning move), and the early-return path above
    // means the cleanup would orphan the timer without scheduling a new one.
    // Pending timers are cancelled explicitly in handleNewGame / handleRestart.
    if (winSheetTimerRef.current !== null) clearTimeout(winSheetTimerRef.current);
    winSheetTimerRef.current = setTimeout(() => {
      winSheetTimerRef.current = null;
      setWinOpen(true);
    }, 600);
  }, [state, recordGame]);

  // Open the auto-complete prompt the first time the tableau has no
  // face-downs left in this game. Stays declined until a new game.
  useEffect(() => {
    if (autoCompleteState !== 'idle') return;
    if (isWon(state)) return;
    if (!isAutoCompletable(state)) return;
    setAutoCompleteState('prompt');
  }, [state, autoCompleteState]);

  // Step the auto-complete loop while the player has accepted.
  useEffect(() => {
    if (autoCompleteState !== 'running') return;
    if (isWon(state)) return;
    const move = nextAutoCompleteMove(state);
    if (move === null) return;
    const id = setTimeout(() => dispatch({ type: 'move', move }), AUTOCOMPLETE_STEP_MS);
    return () => clearTimeout(id);
  }, [state, autoCompleteState]);

  useEffect(() => {
    if (hint === null) return;
    const id = setTimeout(() => setHint(null), HINT_DURATION_MS);
    return () => clearTimeout(id);
  }, [hint]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // 200 ms delay so a quick finger-tap fires onClick (single-tap auto-move)
    // before dnd-kit grabs the touch as a drag. Below ~150 ms the click was
    // intermittently swallowed on real devices.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

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
    feedback('pickup');
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCards(null);
    if (!e.over) {
      feedback('dropInvalid');
      return;
    }
    const data = e.active.data.current as DragData | undefined;
    if (!data) return;
    const move = resolveMove(data, String(e.over.id));
    if (move === null || !canApply(state, move)) {
      feedback('dropInvalid');
      return;
    }
    setSkipForMoves(state.movesMade + 1);
    dispatch({ type: 'move', move });
    feedback(feedbackForMove(move));
  };

  const handleAutoMove = useCallback(
    (source: AutoMoveSource) => {
      if (!autoMoveOnTap) return;
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
      feedback(feedbackForMove(move));
    },
    [state, autoMoveOnTap],
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
        durationSec: Math.max(0, Math.floor(liveActiveMs() / 1000)),
        moves: state.movesMade,
      });
    }
    // Drop the running segment without dispatching a tick — we already used
    // it for the abandoned record (if any), and the reset below installs a
    // fresh activeMs=0. The won-state effect will restart the timer.
    activeSinceRef.current = null;
    setRunningSince(null);
    wonReportedRef.current = false;
    cheatWinRef.current = false;
    if (winSheetTimerRef.current !== null) {
      clearTimeout(winSheetTimerRef.current);
      winSheetTimerRef.current = null;
    }
    setAutoCompleteState('idle');
    dispatch({ type: 'reset', state: createInitialState({ drawCount: settingsDrawCount }) });
  };

  // Hidden cheat: typing "win" anywhere installs a winning state that preserves
  // the current seed, draw count, move count, and active play time. The normal
  // win-detection effect then takes over (records stats, plays cascade, opens
  // the WinSheet) so the resulting score and UI feel real.
  useEffect(() => {
    let buffer = '';
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-3);
      if (buffer !== 'win') return;
      buffer = '';
      cheatWinRef.current = true;
      const winningState: GameState = {
        ...state,
        stock: [],
        talon: [],
        tableau: [[], [], [], [], [], [], []],
        foundations: SUITS.map((suit) => RANKS.map((rank) => makeCard(suit, rank, true))),
      };
      dispatch({ type: 'reset', state: winningState });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  // Re-deal the current seed from scratch — same hand, fresh attempt. Doesn't
  // touch stats: a restart is a continuation of the same deal, not a new game,
  // so it shouldn't inflate the abandoned counter.
  const handleRestart = () => {
    activeSinceRef.current = null;
    setRunningSince(null);
    wonReportedRef.current = false;
    cheatWinRef.current = false;
    if (winSheetTimerRef.current !== null) {
      clearTimeout(winSheetTimerRef.current);
      winSheetTimerRef.current = null;
    }
    setAutoCompleteState('idle');
    dispatch({
      type: 'reset',
      state: createInitialState({ drawCount: state.drawCount, seed: state.seed }),
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
      <div className="board" data-animations={animationsOn ? 'on' : 'off'}>
        <TopBar
          activeMs={state.activeMs}
          runningSince={runningSince}
          moves={state.movesMade}
          canUndo={state.history.length > 0}
          onUndo={handleUndo}
          onHint={handleHint}
          onMenu={() => setMenuOpen(true)}
        />
        {/* LayoutGroup is keyed by seed so layoutId shared-element animations
            never bridge between games (a new deal contains all 52 ids again). */}
        <LayoutGroup id={state.seed}>
          <SkipLayoutAnimProvider value={skipLayoutAnim}>
            <div className="board__main">
              <div className="board__top" data-handedness={handedness}>
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
        <AutoCompleteSheet
          open={autoCompleteState === 'prompt'}
          onAccept={() => setAutoCompleteState('running')}
          onDecline={() => setAutoCompleteState('declined')}
        />
        <MenuSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNewGame={handleNewGame}
          onRestart={handleRestart}
          canRestart={state.movesMade > 0}
        />
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
          score={winScoreRef.current}
          isNewBest={winIsNewBestRef.current}
          showConfetti={animationsOn}
        />
      </div>
    </DndContext>
  );
}
