import { Capacitor } from '@capacitor/core';

export const initNativeLifecycle = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  // Android 15 forces edge-to-edge but its WebView often reports
  // env(safe-area-inset-top) as 0. Floor --safe-top at 56px so the topbar
  // clears the OS clock; env() wins if it reports something larger.
  if (Capacitor.getPlatform() === 'android') {
    document.documentElement.style.setProperty(
      '--safe-top',
      'max(env(safe-area-inset-top, 0px), 56px)',
    );
  }

  // Native shells need extra breathing room below the buttons so the
  // dark topbar band doesn't feel top-heavy under the OS status bar.
  // Web defaults to 10px (theme.css) for a tight, balanced strip.
  document.documentElement.style.setProperty('--topbar-pad-bottom', '22px');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#0f3818' });
  } catch {
    /* status bar plugin may not be available; ignore */
  }
};
