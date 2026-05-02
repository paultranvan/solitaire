import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paultranvan.solitaire',
  appName: 'Solitaire',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'always',
    backgroundColor: '#0f3818',
  },
  android: {
    backgroundColor: '#0f3818',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 800,
      backgroundColor: '#0f3818',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f3818',
      // Let the WebView paint behind the system bar so the felt color
      // shows through. The topbar's padding-top uses --safe-top (which is
      // forced to a 44px floor on Android in lifecycle.ts because
      // Chromium's env(safe-area-inset-top) is unreliable on edge-to-edge
      // Android 15).
      overlaysWebView: true,
    },
  },
};

export default config;
