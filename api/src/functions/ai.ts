import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { handleAi } from '../../../server/handler.ts';
import { toAzureResponse, toWebRequest } from '../adapter.ts';

/**
 * Served at /api/ai by Azure Static Web Apps.
 *
 * Credentials come from the Static Web App's Application Settings, which land
 * in `process.env` — they are never sent to the browser. A GET is the
 * capability probe the UI uses to decide whether to offer the feature at all,
 * so an unconfigured deployment degrades quietly instead of erroring.
 */
app.http('ai', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'ai',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> =>
    toAzureResponse(await handleAi(await toWebRequest(request), process.env)),
});
