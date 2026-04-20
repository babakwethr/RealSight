import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.realsight.invest',
  appName: 'RealSight',
  webDir: 'dist',
  // No server.url — app loads from local dist/ files (required for App Store)
  ios: {
    // automatic = safe-area insets handled by the WKWebView automatically
    contentInset: 'automatic',
    scrollEnabled: true,
    // Prevent the WKWebView from showing a browser URL bar
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: false,
  },
  // No allowNavigation — external URLs (Google OAuth, Supabase) open in Safari.
  // After OAuth, the custom URL scheme (app.realsight.invest://) brings the user
  // back to the app. This is the most reliable approach for iOS OAuth.
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0B1120',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B1120',
      overlaysWebView: false,
    },
  },
};

export default config;
