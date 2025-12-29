import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.frepo.twa',
  appName: 'fRepo',
  webDir: 'out',
  // Load from live web URL (supports SSR features)
  // Native plugins still work via bridge
  server: {
    url: 'https://frepo.app',
    cleartext: false,
  },
  android: {
    // Allow mixed content for any local development needs
    allowMixedContent: false,
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#000000',
    },
  },
};

export default config;
