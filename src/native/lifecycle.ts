import { Capacitor } from '@capacitor/core';

/**
 * Hook native lifecycle events (Capacitor App + StatusBar). Safe no-op on web.
 * Must be called once during app boot.
 */
export const initNativeLifecycle = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  // Android 15 forces edge-to-edge but its WebView often reports
  // env(safe-area-inset-top) as 0. Floor at 56px so the topbar buttons
  // park clearly below the OS clock (typically ~24–32dp = 72–96 device
  // px on this density), with the topbar's own 14px padding-bottom
  // keeping a comfortable gap before the game cards. env() wins if it
  // ever reports something larger.
  if (Capacitor.getPlatform() === 'android') {
    document.documentElement.style.setProperty(
      '--safe-top',
      'max(env(safe-area-inset-top, 0px), 56px)',
    );
  }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
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
