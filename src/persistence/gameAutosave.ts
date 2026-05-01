import { useEffect, useRef } from 'react';
import { GameState } from '@/game/state';
import { isWon } from '@/game/rules';
import { KEY_GAME, loadKey, removeKey, saveKey } from './db';

const SAVE_DEBOUNCE_MS = 250;

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
      saveKey(KEY_GAME, state.schemaVersion, state);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state]);
};

export const loadSavedGame = async (): Promise<GameState | null> => {
  const loaded = await loadKey<GameState>(KEY_GAME);
  if (!loaded || loaded.schemaVersion !== 1) return null;
  // Sanity: a saved won game should not exist (we clear it), but defend anyway.
  if (loaded.foundations && loaded.foundations.every((p) => p.length === 13)) return null;
  return loaded;
};

export const clearSavedGame = (): Promise<void> => removeKey(KEY_GAME);
