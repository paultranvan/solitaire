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
      // Android 15's forced edge-to-edge is opted out via the activity theme
      // (see android/app/src/main/res/values/styles.xml — windowOptOutEdge
      // ToEdgeEnforcement=true), so this flag is honored: the system bar
      // sits above the WebView, painted with backgroundColor.
      overlaysWebView: false,
    },
  },
};

export default config;
