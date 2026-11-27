import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Si un asset de assets/ (audio, sprite) no existe, responde 404 en vez de devolver index.html (que Phaser intentaría decodificar y llenaría la
// consola de errores "Failed to process file"). Lo hago en desarrollo (pnpm dev) y también en la vista previa (pnpm preview), que sirve la
// carpeta dist y por defecto también devuelve index.html para lo que no encuentra.
function sinFallbackEnAssets() {
  const responder404 = (carpeta) => (req, res, next) => {
    const url = decodeURIComponent((req.url ?? '').split('?')[0]);
    if (url.startsWith('/assets/') && !fs.existsSync(path.join(carpeta, url))) {
      res.statusCode = 404;
      return res.end();
    }
    next();
  };
  return {
    name: 'sin-fallback-en-assets',
    configureServer(server) {
      server.middlewares.use(responder404(server.config.publicDir));
    },
    configurePreviewServer(server) {
      server.middlewares.use(responder404(path.resolve(server.config.root, server.config.build.outDir)));
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
  // Para probar el multijugador desde otra computadora con los puertos de VS Code (Dev Tunnels): Vite rechaza los nombres de host que no conoce,
  // así que dejo pasar los de los túneles (https://xxxx-5173.use.devtunnels.ms)
  server: { allowedHosts: ['.devtunnels.ms'] },
  preview: { allowedHosts: ['.devtunnels.ms'] },
});
