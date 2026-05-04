import { useEffect, useState } from 'react';
import { createInitialState, GameState } from '@/game/state';
import { initNativeLifecycle } from '@/native/lifecycle';
import { loadSavedGame } from '@/persistence/gameAutosave';
import { hydrateSettingsFromStorage, useSettingsStore } from '@/store/settingsStore';
import { hydrateStatsFromStorage } from '@/store/statsStore';
import { Board } from '@/ui/Board';
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
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)',
          background: 'var(--felt-dark)',
          fontFamily: 'system-ui',
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  return <Board initial={initial} />;
}
