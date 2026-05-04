import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { KEY_SETTINGS, loadKey, saveKey } from '@/persistence/db';
import { detectInitialLang, Lang } from '@/i18n/strings';

export type Settings = {
  schemaVersion: 1;
  drawCount: 1 | 3;
  sound: boolean;
  haptics: boolean;
  animations: boolean;
  handedness: 'right' | 'left';
  // When on, "New game" reshuffles until the solver proves the deal
  // winnable (within a short per-attempt budget). The toggle is opt-in
  // because it adds a sub-second pause to new-game.
  requireWinnable: boolean;
  // UI language. Auto-detected from navigator.language on first run; once
  // hydrated, the persisted choice wins so a user who explicitly picked
  // English on a French-locale system stays in English.
  language: Lang;
};

export const defaultSettings = (): Settings => ({
  schemaVersion: 1,
  drawCount: 1,
  sound: true,
  haptics: true,
  animations: true,
  handedness: 'right',
  requireWinnable: false,
  language: detectInitialLang(),
});

type SettingsStore = {
  settings: Settings;
  hydrate: (s: Settings) => void;
  update: (patch: Partial<Settings>) => void;
};

const persist = (s: Settings) => void saveKey(KEY_SETTINGS, s.schemaVersion, s);

export const useSettingsStore = create<SettingsStore>()(
  immer((set) => ({
    settings: defaultSettings(),
    hydrate: (s) =>
      set((state) => {
        // Spread defaults under loaded values so renamed/added fields fall back
        // to their defaults instead of becoming undefined. Lets us evolve the
        // shape without bumping schemaVersion for every rename.
        state.settings = { ...defaultSettings(), ...s };
      }),
    // persist() must run AFTER set() returns, not inside the producer: idb-keyval's
    // write opens the DB asynchronously and only structured-clones the value once
    // dbp resolves, by which point immer has revoked the draft proxy and the put
    // throws (silently — saveKey swallows it).
    update: (patch) => {
      set((state) => {
        Object.assign(state.settings, patch);
      });
      persist(useSettingsStore.getState().settings);
    },
  })),
);

export const hydrateSettingsFromStorage = async (): Promise<void> => {
  const loaded = await loadKey<Settings>(KEY_SETTINGS);
  if (loaded && loaded.schemaVersion === 1) {
    useSettingsStore.getState().hydrate(loaded);
  }
};
