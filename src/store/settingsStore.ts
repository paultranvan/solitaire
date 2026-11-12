import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { KEY_SETTINGS, loadKey, saveKey } from '@/persistence/db';
import { detectInitialLang, Lang } from '@/i18n/strings';
import { normalizeName } from '@/leaderboard/name';

export type CardBack = 'navy' | 'crimson' | 'emerald';

// Canonical order — shared by the picker UI and tests.
export const CARD_BACKS: CardBack[] = ['navy', 'crimson', 'emerald'];

export type Settings = {
  schemaVersion: 1;
  drawCount: 1 | 3;
  sound: boolean;
  haptics: boolean;
  animations: boolean;
  handedness: 'right' | 'left';
  // Chosen card-back design. See CARD_BACKS / Card.css variant classes.
  cardBack: CardBack;
  // When on, "New game" reshuffles until the solver proves the deal
  // winnable (within a short per-attempt budget). The toggle is opt-in
  // because it adds a sub-second pause to new-game.
  requireWinnable: boolean;
  // UI language. Auto-detected from navigator.language on first run; once
  // hydrated, the persisted choice wins so a user who explicitly picked
  // English on a French-locale system stays in English.
  language: Lang;
  // Shared leaderboard participation. 'ask' is the starting state: taking part
  // is the default, but nothing is sent until the player has seen the publish
  // prompt on their first eligible win and answered it ('on' / 'off').
  leaderboard: LeaderboardChoice;
  // Display name shown on the shared leaderboard; '' until the player picks one.
  playerName: string;
};

export type LeaderboardChoice = 'ask' | 'on' | 'off';

export const defaultSettings = (): Settings => ({
  schemaVersion: 1,
  drawCount: 1,
  sound: true,
  haptics: true,
  animations: true,
  handedness: 'right',
  cardBack: 'navy',
  requireWinnable: false,
  language: detectInitialLang(),
  leaderboard: 'ask',
  playerName: '',
});

const LANGS: readonly Lang[] = ['en', 'fr'];

// Keeps only the known settings whose stored value is one we'd write ourselves.
// The persisted blob is untrusted (hand-edited storage, another app on the same
// origin reusing the key, a downgrade): an unknown `language` would crash every
// translation lookup at boot, and `cardBack` is interpolated into a class name.
// Anything missing or invalid simply falls back to its default in hydrate().
export const sanitizeSettings = (raw: unknown): Partial<Settings> => {
  if (typeof raw !== 'object' || raw === null) return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (o.drawCount === 1 || o.drawCount === 3) out.drawCount = o.drawCount;
  if (typeof o.sound === 'boolean') out.sound = o.sound;
  if (typeof o.haptics === 'boolean') out.haptics = o.haptics;
  if (typeof o.animations === 'boolean') out.animations = o.animations;
  if (o.handedness === 'right' || o.handedness === 'left') out.handedness = o.handedness;
  if (CARD_BACKS.includes(o.cardBack as CardBack)) out.cardBack = o.cardBack as CardBack;
  if (typeof o.requireWinnable === 'boolean') out.requireWinnable = o.requireWinnable;
  if (LANGS.includes(o.language as Lang)) out.language = o.language as Lang;
  if (o.leaderboard === 'ask' || o.leaderboard === 'on' || o.leaderboard === 'off') {
    out.leaderboard = o.leaderboard;
  }
  // Same rules the server enforces; an unacceptable stored name is dropped and
  // the player is simply asked again.
  const playerName = normalizeName(o.playerName);
  if (playerName !== null) out.playerName = playerName;
  return out;
};

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
        // Loaded values are validated first — see sanitizeSettings.
        state.settings = { ...defaultSettings(), ...sanitizeSettings(s) };
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
