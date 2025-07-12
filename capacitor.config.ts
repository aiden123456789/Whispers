import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akingb15.whispers',
  appName: 'Whispers',
  webDir: 'dist',
  server: {
    url: 'https://whispers-six.vercel.app', // 👈 your live website
    cleartext: true
  },
};

export default config;
