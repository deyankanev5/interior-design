import { handlePinterest } from '../server/handler.ts';

/**
 * Serverless entry point (Vercel / Netlify edge-style signature).
 * Deploy this alongside the static build to enable Pinterest import.
 */
export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handlePinterest(request);
}
