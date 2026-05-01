import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useSettingsStore } from '@/store/settingsStore';

export type HapticKind = 'pickup' | 'dropValid' | 'dropInvalid' | 'foundation' | 'win';

const enabled = (): boolean => useSettingsStore.getState().settings.haptics;

const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const canVibrate = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const WEB_PATTERNS: Record<HapticKind, number | number[]> = {
  pickup: 8,
  dropValid: 14,
  dropInvalid: [10, 40, 10],
  foundation: 24,
  win: [30, 60, 30, 60, 80],
};

export const haptic = (kind: HapticKind): void => {
  if (!enabled()) return;

  if (isNative()) {
    switch (kind) {
      case 'pickup':
        void Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'dropValid':
        void Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'dropInvalid':
        void Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'foundation':
        void Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'win':
        void Haptics.notification({ type: NotificationType.Success });
        break;
    }
    return;
  }

  if (canVibrate()) navigator.vibrate(WEB_PATTERNS[kind]);
};
