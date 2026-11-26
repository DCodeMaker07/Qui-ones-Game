import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Solo en desarrollo: si un asset de public/assets (audio, sprite) no existe, responde 404
// en vez de devolver index.html (que Phaser intentaría decodificar y llenaría la consola de errores).
function sinFallbackEnAssets() {
  return {
    name: 'sin-fallback-en-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        if (url.startsWith('/assets/') && !fs.existsSync(path.join(server.config.publicDir, url))) {
          res.statusCode = 404;
          return res.end();
        }
        next();
      });
    },
  };
}

// base './' permite publicar en GitHub Pages, Netlify o Vercel sin tocar rutas.
export default defineConfig({
  base: './',
  plugins: [tailwindcss(), sinFallbackEnAssets()],
  build: {
    chunkSizeWarningLimit: 2000, // Phaser pesa ~1.2 MB
  },
});
