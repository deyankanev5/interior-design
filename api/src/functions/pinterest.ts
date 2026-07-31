import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { handlePinterest } from '../../../server/handler.ts';
import { toAzureResponse, toWebRequest } from '../adapter.ts';

/** Served at /api/pinterest by Azure Static Web Apps. */
app.http('pinterest', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'pinterest',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> =>
    toAzureResponse(await handlePinterest(await toWebRequest(request))),
});
