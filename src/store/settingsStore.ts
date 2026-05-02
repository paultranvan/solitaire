import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { KEY_SETTINGS, loadKey, saveKey } from '@/persistence/db';

export type Settings = {
  schemaVersion: 1;
  drawCount: 1 | 3;
  sound: boolean;
  haptics: boolean;
  animations: boolean;
  autoMoveOnTap: boolean;
  handedness: 'right' | 'left';
};

export const defaultSettings = (): Settings => ({
  schemaVersion: 1,
  drawCount: 1,
  sound: true,
  haptics: true,
  animations: true,
  autoMoveOnTap: true,
  handedness: 'right',
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
        // shape (e.g. autoMoveOnDoubleTap → autoMoveOnTap) without bumping
        // schemaVersion for every rename.
        state.settings = { ...defaultSettings(), ...s };
      }),
    update: (patch) =>
      set((state) => {
        Object.assign(state.settings, patch);
        persist(state.settings);
      }),
  })),
);

export const hydrateSettingsFromStorage = async (): Promise<void> => {
  const loaded = await loadKey<Settings>(KEY_SETTINGS);
  if (loaded && loaded.schemaVersion === 1) {
    useSettingsStore.getState().hydrate(loaded);
  }
};
