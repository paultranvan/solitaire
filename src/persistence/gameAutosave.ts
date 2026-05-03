import { useEffect, useRef } from 'react';
import { GameState } from '@/game/state';
import { isWon } from '@/game/rules';
import { KEY_GAME, loadKey, removeKey, saveKey } from './db';

const SAVE_DEBOUNCE_MS = 250;

// Autosave doesn't persist history — undo doesn't survive reloads, and
// keeping it would write up to 200 prior snapshots on every move.
type SavedGame = Omit<GameState, 'history'>;

const stripHistory = (state: GameState): SavedGame => {
  const { history: _h, ...rest } = state;
  return rest;
};

export const useGameAutosave = (state: GameState): void => {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);

    if (isWon(state)) {
      // Game complete — clear the in-progress save.
      removeKey(KEY_GAME);
      return;
    }

    timer.current = window.setTimeout(() => {
      saveKey(KEY_GAME, state.schemaVersion, stripHistory(state));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state]);
};

export const loadSavedGame = async (): Promise<GameState | null> => {
  const loaded = await loadKey<SavedGame>(KEY_GAME);
  if (!loaded || loaded.schemaVersion !== 1) return null;
  const restored: GameState = { ...loaded, history: [] };
  // Belt-and-braces: the autosave clears on win, but defend in case a stale
  // won state survives (downgrade, manual IDB write, etc.).
  if (isWon(restored)) return null;
  return restored;
};
