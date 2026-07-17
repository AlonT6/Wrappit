import 'server-only';
import { createClient, ApiKeyStrategy } from '@wix/sdk';
import { items } from '@wix/data';

/**
 * Trusted server-side Wix client backed by the secret API key.
 * Used in Route Handlers / Server Actions for tamper-proof writes and for
 * whitelisted public invite reads — so Wix Data collections never need to be
 * opened to "Anyone" and guests never authenticate. NEVER import this from a
 * client component: WIX_API_KEY must stay server-only.
 */
export function getWixApiClient() {
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  if (!apiKey || !siteId) {
    throw new Error(
      'Missing WIX_API_KEY / WIX_SITE_ID. Set them in .env.local (local) and Netlify env (prod).',
    );
  }
  return createClient({
    modules: { items },
    auth: ApiKeyStrategy({ apiKey, siteId }),
  });
}
