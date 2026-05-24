import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.realsight.invest',
  appName: 'RealSight',
  webDir: 'dist',
  // No server.url — app loads from local dist/ files (required for App Store)
  ios: {
    // `never` = the WKWebView does NOT add its own safe-area content
    // inset. The native status bar is opaque (overlaysWebView: false)
    // so the webview already sits below it — letting the scroll view
    // ALSO inset would stack a second empty band at the top.
    contentInset: 'never',
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
      backgroundColor: '#07040F',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07040F',
      overlaysWebView: false,
    },
  },
};

export default config;
