import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAi, handlePinterest } from './server/handler.ts';

/**
 * Serves /api/* during `vite dev` and `vite preview` using the same handlers
 * the deployed serverless functions use, so local development and production
 * behave identically.
 */
function apiRoutes(): Plugin {
  const middleware = async (
    req: { url?: string; method?: string; on: (e: string, cb: (c?: unknown) => void) => void },
    res: {
      statusCode: number;
      setHeader(k: string, v: string): void;
      end(chunk?: unknown): void;
    },
    next: () => void,
  ) => {
    if (!req.url?.startsWith('/api/')) return next();

    const method = req.method ?? 'GET';
    const body = method === 'POST' ? await readBody(req) : undefined;
    const request = new Request(`http://localhost${req.url}`, { method, body });

    const response = req.url.startsWith('/api/ai')
      ? await handleAi(request, process.env)
      : await handlePinterest(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  };

  return {
    name: 'api-routes',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

function readBody(req: { on: (e: string, cb: (c?: unknown) => void) => void }): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c as Uint8Array)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

export default defineConfig({
  plugins: [react(), apiRoutes()],
});
