import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.gov.dosje.saarthi',
  appName: 'Saarthi Monitoring',
  webDir: 'public',
  android: {
    allowMixedContent: false
  }
};

export default config;
