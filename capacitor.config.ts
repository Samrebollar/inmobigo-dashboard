import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mx.inmobigo.app',
  appName: 'InmobiGo',
  webDir: 'public',
  server: {
    // La app nativa carga el sitio en producción tal cual está hoy —
    // no se empaqueta ni se copia el build de Next.js dentro de la app,
    // así que cualquier cambio que se publique en app.inmobigo.mx se
    // refleja de inmediato en la app instalada, sin tener que volver a
    // compilar ni resubir nada a las tiendas.
    url: 'https://app.inmobigo.mx',
    cleartext: false,
  },
};

export default config;
