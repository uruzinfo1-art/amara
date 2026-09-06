import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amara.app',
  appName: 'AMARA',
  webDir: 'dist',
  // La app carga la web en vivo de Vercel: los cambios de frontend llegan al
  // celular sin recompilar. El contenido de dist/ queda solo como respaldo.
  server: {
    url: 'https://amara-weld.vercel.app',
    cleartext: false,
  },
};

export default config;
