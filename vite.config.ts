import { copyFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages serves a project site from a subdirectory —
 * `https://<user>.github.io/<repo>/` — so every asset URL has to be prefixed
 * with the repository name. Getting this wrong is the classic Pages failure:
 * the page loads, finds nothing at `/assets/…`, and renders blank.
 *
 * Override with BASE_PATH when publishing somewhere else, e.g. `BASE_PATH=/`
 * for a custom domain or a user site.
 */
const base = process.env.BASE_PATH ?? '/interior-design/';

/**
 * Pages has no server-side rewrites, so a deep link is a real 404. Serving the
 * app from 404.html as well means those requests still land on the app, which
 * then reads the scheme out of the URL fragment as usual.
 */
function pagesFallback(): Plugin {
  return {
    name: 'pages-404-fallback',
    apply: 'build',
    closeBundle() {
      copyFileSync('dist/index.html', 'dist/404.html');
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), pagesFallback()],
  build: {
    // Pages is a CDN with no build step of its own; keep the output plain.
    target: 'es2022',
    sourcemap: false,
  },
});
