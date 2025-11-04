import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.planer',
  appName: 'planer',
  webDir: 'dist',
  "plugins": {
    "EdgeToEdge": {
      "backgroundColor": "#000000"
    }
  },
  
    server: {
      url: 'https://planer.m-k-mendykhan.workers.dev/',
      androidScheme:'https'

    },
};

export default config;
