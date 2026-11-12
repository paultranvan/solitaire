import { useEffect, useState } from 'react';
import { createInitialState, GameState } from '@/game/state';
import { initNativeLifecycle } from '@/native/lifecycle';
import { loadSavedGame } from '@/persistence/gameAutosave';
import { hydrateSettingsFromStorage, useSettingsStore } from '@/store/settingsStore';
import { hydrateStatsFromStorage } from '@/store/statsStore';
import { SUITS } from '@/game/card';
import { Board } from '@/ui/Board';
import { Suit } from '@/ui/Suit';
import './ui/theme.css';

export default function App() {
  const [initial, setInitial] = useState<GameState | null>(null);
  const language = useSettingsStore((s) => s.settings.language);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Hydrate settings + stats first (needed for default drawCount).
      await Promise.all([
        hydrateSettingsFromStorage(),
        hydrateStatsFromStorage(),
        initNativeLifecycle(),
      ]);
      const saved = await loadSavedGame();
      if (cancelled) return;
      if (saved) {
        setInitial(saved);
      } else {
        setInitial(
          createInitialState({ drawCount: useSettingsStore.getState().settings.drawCount }),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror the chosen language onto <html lang> so screen readers and the
  // browser pick the right pronunciation/hyphenation.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (!initial) {
    // Boot screen: the four suits pulsing on the felt while stores hydrate.
    // Usually on screen for a frame or two, so it carries no text to localize.
    return (
      <div className="app-loading" role="status" aria-label="Loading">
        {SUITS.map((suit) => (
          <Suit key={suit} suit={suit} className="app-loading__suit" />
        ))}
      </div>
    );
  }

  return <Board initial={initial} />;
}
