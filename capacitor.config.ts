import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.frepo.fitness',
  appName: 'fitness Repo',
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
};

export default config;
