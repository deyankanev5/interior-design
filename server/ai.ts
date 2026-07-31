/**
 * Optional Azure AI Foundry proxy.
 *
 * The key never reaches the browser: the client posts a brief here, this
 * forwards it to the configured deployment, and only the parsed result comes
 * back. If the environment variables are absent the endpoint reports that
 * cleanly and the app carries on without it — every feature that matters works
 * with the deterministic engine alone.
 *
 * Required environment variables:
 *   AZURE_AI_ENDPOINT    https://<resource>.openai.azure.com  (or your Foundry endpoint)
 *   AZURE_AI_API_KEY     the key from the Foundry portal
 *   AZURE_AI_DEPLOYMENT  the deployment name, e.g. gpt-4o-mini
 *   AZURE_AI_API_VERSION optional, defaults to 2024-10-21
 */

export interface AiConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

export function readConfig(env: Record<string, string | undefined>): AiConfig | null {
  const endpoint = env.AZURE_AI_ENDPOINT?.replace(/\/+$/, '');
  const apiKey = env.AZURE_AI_API_KEY;
  const deployment = env.AZURE_AI_DEPLOYMENT;
  if (!endpoint || !apiKey || !deployment) return null;
  return { endpoint, apiKey, deployment, apiVersion: env.AZURE_AI_API_VERSION ?? '2024-10-21' };
}

/**
 * The model's entire job is to turn prose into *constraints*. It never picks a
 * decor: it cannot see the catalogue, and anything it invented would be a
 * plausible-looking product code that does not exist — the one failure mode a
 * document someone orders from cannot tolerate. The engine then satisfies those
 * constraints from real catalogue entries.
 */
const BRIEF_SYSTEM = `You translate an interior designer's brief into palette constraints for a
deterministic colour engine. You never name products, decor codes, brands or hex values.

Reply with JSON only, matching exactly:
{
  "scheme": one of "auto"|"analogous"|"complementary"|"split-complementary"|"triadic"|"monochromatic"|"neutral-accent"|"earthy"|"nordic",
  "mood": one of "any"|"warm"|"cool"|"muted"|"bold"|"light"|"dark",
  "surfaces": an array of 2-8 items, each one of "ceiling"|"wall"|"floor"|"furniture"|"worktop"|"textile"|"accent",
  "rationale": one or two sentences, plain prose, explaining the choice to the designer
}

Guidance: north-facing or small rooms favour lighter, warmer schemes; kitchens and
bathrooms need a worktop slot; bedrooms and living rooms need a textile slot. Include
exactly one "accent" unless the brief asks for a purely tonal scheme.`;

const EXPLAIN_SYSTEM = `You are writing the short rationale paragraph that accompanies a finish
schedule in an interior design proposal. You will be given the scheme's surfaces, their
colours, their LRV values and the engine's own review findings.

Write 3-5 sentences of plain, specific prose for the client. Describe how the scheme reads
in the room and why the pieces work together. Do not invent product names, brands or codes
beyond those given. Do not use bullet points or headings. Do not flatter.`;

async function callAzure(config: AiConfig, messages: unknown[], jsonMode: boolean): Promise<string> {
  const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': config.apiKey },
    body: JSON.stringify({
      messages,
      temperature: 0.4,
      max_tokens: 700,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw Object.assign(new Error(`Azure AI returned ${res.status}. ${detail.slice(0, 300)}`), {
      status: res.status === 401 || res.status === 403 ? 502 : 502,
    });
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw Object.assign(new Error('Azure AI returned an empty response.'), { status: 502 });
  return content;
}

export async function runBrief(config: AiConfig, brief: string): Promise<unknown> {
  const raw = await callAzure(
    config,
    [
      { role: 'system', content: BRIEF_SYSTEM },
      { role: 'user', content: brief.slice(0, 2000) },
    ],
    true,
  );
  return JSON.parse(raw);
}

export async function runExplain(config: AiConfig, summary: string): Promise<string> {
  return callAzure(
    config,
    [
      { role: 'system', content: EXPLAIN_SYSTEM },
      { role: 'user', content: summary.slice(0, 4000) },
    ],
    false,
  );
}
