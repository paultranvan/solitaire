import { Capacitor } from '@capacitor/core';

/**
 * Hook native lifecycle events (Capacitor App + StatusBar). Safe no-op on web.
 * Must be called once during app boot.
 */
export const initNativeLifecycle = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#0f3818' });
  } catch {
    /* status bar plugin may not be available; ignore */
  }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appStateChange', ({ isActive }) => {
      // App went to background or returned. Currently no-op; the autosave
      // is debounced 250ms so any pending writes flush naturally. If we ever
      // need explicit pause/resume, hook it here.
      void isActive;
    });
  } catch {
    /* app plugin may not be available */
  }
};
