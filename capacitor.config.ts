import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paultranvan.solitaire',
  appName: 'Solitaire',
  webDir: 'dist',
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
      // Let the WebView paint behind the system bar so the felt colour
      // shows through. The topbar's padding-top uses --safe-top, which
      // lifecycle.ts floors on Android because Chromium's
      // env(safe-area-inset-top) is unreliable under edge-to-edge.
      overlaysWebView: true,
    },
  },
};

export default config;
