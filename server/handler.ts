import { fetchPinImage, resolvePin } from './pinterest.ts';
import { readConfig, runBrief, runExplain, type AiConfig } from './ai.ts';

/**
 * Runtime-agnostic request handlers shared by the Vite dev middleware and the
 * serverless entry points, so local development and production behave the same.
 *
 *   GET  /api/pinterest?url=<pin url>   -> { imageUrl, proxyUrl, title }
 *   GET  /api/pinterest?image=<img url> -> the image bytes, same-origin
 *   GET  /api/ai                        -> { available: boolean }
 *   POST /api/ai  { mode, brief|summary } -> constraints, or rationale prose
 */
export async function handlePinterest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pin = url.searchParams.get('url');
  const image = url.searchParams.get('image');

  try {
    if (image) {
      const { body, contentType } = await fetchPinImage(image);
      return new Response(body, {
        headers: {
          'content-type': contentType,
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    if (pin) {
      const resolved = await resolvePin(pin);
      return json({
        ...resolved,
        proxyUrl: `/api/pinterest?image=${encodeURIComponent(resolved.imageUrl)}`,
      });
    }

    return json({ error: 'Pass either ?url= (a pin) or ?image= (a pinimg URL).' }, 400);
  } catch (err) {
    return fail(err);
  }
}

export async function handleAi(request: Request, env: Record<string, string | undefined>): Promise<Response> {
  const config: AiConfig | null = readConfig(env);

  // A GET is the capability probe the UI uses to decide whether to offer the feature.
  if (request.method === 'GET') {
    return json({ available: config !== null });
  }

  if (!config) {
    return json(
      {
        error:
          'Azure AI is not configured on this deployment. Set AZURE_AI_ENDPOINT, AZURE_AI_API_KEY and AZURE_AI_DEPLOYMENT to enable it.',
      },
      501,
    );
  }

  try {
    const body = (await request.json()) as { mode?: string; brief?: string; summary?: string };

    if (body.mode === 'brief' && body.brief) {
      return json({ result: await runBrief(config, body.brief) });
    }
    if (body.mode === 'explain' && body.summary) {
      return json({ text: await runExplain(config, body.summary) });
    }
    return json({ error: 'Expected { mode: "brief", brief } or { mode: "explain", summary }.' }, 400);
  } catch (err) {
    return fail(err);
  }
}

function fail(err: unknown): Response {
  const status = (err as { status?: number }).status ?? 500;
  return json({ error: (err as Error).message ?? 'Unexpected error.' }, status);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
