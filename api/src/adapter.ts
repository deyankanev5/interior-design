import type { HttpRequest, HttpResponseInit } from '@azure/functions';

/**
 * Bridge between the Azure Functions HTTP model and the runtime-agnostic
 * handlers in `server/`.
 *
 * The handlers are written against the Web `Request`/`Response` pair so the
 * same code serves the Vite dev middleware and any host we deploy to. Azure
 * Functions v4 is already built on undici, so this is a shape translation
 * rather than a reimplementation.
 */
export async function toWebRequest(request: HttpRequest): Promise<Request> {
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(request.url, {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    ...(hasBody ? { body: await request.text() } : {}),
  });
}

export async function toAzureResponse(response: Response): Promise<HttpResponseInit> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    headers,
    // Buffer rather than a stream: these responses are a small JSON blob or a
    // single proxied image, and buffering keeps the adapter trivial.
    body: Buffer.from(await response.arrayBuffer()),
  };
}
