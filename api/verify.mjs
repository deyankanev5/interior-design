/**
 * Exercises the built Azure Functions bundles without the Functions host.
 *
 *   node api/verify.mjs
 *
 * Stubs `@azure/functions` to capture the registered handlers, then invokes
 * them with a realistic HttpRequest. This checks the thing most likely to be
 * wrong after a runtime change — the adapter between Azure's HTTP model and the
 * Web Request/Response handlers in server/ — without needing Azure at all.
 */
import { createRequire } from 'node:module';

const registered = new Map();
const require = createRequire(import.meta.url);

// Intercept `require('@azure/functions')` inside the CJS bundles so the
// registered handlers can be captured and called directly.
const Module = require('node:module');
const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  if (request === '@azure/functions') {
    return {
      app: {
        http(name, options) {
          registered.set(name, options);
        },
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

require('./dist/functions/pinterest.js');
require('./dist/functions/ai.js');

console.log('registered functions:', [...registered.keys()].join(', '));

function httpRequest(url, method = 'GET', body) {
  return {
    url,
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => body ?? '',
  };
}

let failures = 0;
const check = (label, condition, detail) => {
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
};

const decode = (res) => Buffer.from(res.body).toString('utf8');

/* --- /api/ai capability probe, with no credentials configured ------------- */
{
  const { handler } = registered.get('ai');
  const res = await handler(httpRequest('https://example.org/api/ai'));
  const body = JSON.parse(decode(res));
  check('GET /api/ai returns 200', res.status === 200, `status ${res.status}`);
  check('reports unavailable without credentials', body.available === false, JSON.stringify(body));
  check('content-type is JSON', /application\/json/.test(res.headers['content-type'] ?? ''));
}

/* --- /api/ai rejects work when unconfigured ------------------------------- */
{
  const { handler } = registered.get('ai');
  const res = await handler(
    httpRequest('https://example.org/api/ai', 'POST', JSON.stringify({ mode: 'brief', brief: 'test' })),
  );
  check('POST /api/ai without config returns 501', res.status === 501, `status ${res.status}`);
  check('explains how to configure it', /AZURE_AI_ENDPOINT/.test(decode(res)));
}

/* --- /api/ai with credentials present ------------------------------------- */
{
  process.env.AZURE_AI_ENDPOINT = 'https://example.openai.azure.com';
  process.env.AZURE_AI_API_KEY = 'test-key';
  process.env.AZURE_AI_DEPLOYMENT = 'test-deployment';

  const { handler } = registered.get('ai');
  const res = await handler(httpRequest('https://example.org/api/ai'));
  check('reports available once configured', JSON.parse(decode(res)).available === true);

  delete process.env.AZURE_AI_ENDPOINT;
  delete process.env.AZURE_AI_API_KEY;
  delete process.env.AZURE_AI_DEPLOYMENT;
}

/* --- /api/pinterest argument validation ----------------------------------- */
{
  const { handler } = registered.get('pinterest');

  const noArgs = await handler(httpRequest('https://example.org/api/pinterest'));
  check('GET /api/pinterest with no args returns 400', noArgs.status === 400, `status ${noArgs.status}`);

  // The image proxy must refuse anything that is not a Pinterest CDN host,
  // otherwise this endpoint becomes an open proxy.
  const openProxy = await handler(
    httpRequest('https://example.org/api/pinterest?image=https%3A%2F%2Fevil.example.com%2Fa.jpg'),
  );
  check('refuses to proxy non-Pinterest hosts', openProxy.status === 400, `status ${openProxy.status}`);
  check('says why', /Pinterest image hosts/.test(decode(openProxy)));

  const notAPin = await handler(
    httpRequest('https://example.org/api/pinterest?url=https%3A%2F%2Fexample.com%2Fnope'),
  );
  check('rejects non-Pinterest pin URLs', notAPin.status === 400, `status ${notAPin.status}`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
