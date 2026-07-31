import { handleAi } from '../server/handler.ts';

/**
 * Serverless entry point for the optional Azure AI Foundry features.
 * Reads its credentials from the deployment's environment variables.
 */
export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return handleAi(request, env);
}
