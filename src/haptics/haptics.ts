import { useSettingsStore } from '@/store/settingsStore';

export type HapticKind = 'pickup' | 'dropValid' | 'dropInvalid' | 'foundation' | 'win';

const PATTERNS: Record<HapticKind, number | number[]> = {
  pickup: 8,
  dropValid: 14,
  dropInvalid: [10, 40, 10],
  foundation: 24,
  win: [30, 60, 30, 60, 80],
};

const enabled = (): boolean => useSettingsStore.getState().settings.haptics;

const canVibrate = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptic = (kind: HapticKind): void => {
  if (!enabled()) return;
  if (!canVibrate()) return;
  navigator.vibrate(PATTERNS[kind]);
};
