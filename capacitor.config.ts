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
      overlaysWebView: true,
    },
  },
};

export default config;
