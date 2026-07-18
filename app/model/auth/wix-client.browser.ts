import Cookies from 'js-cookie';
import { getWixClient, type WixClient } from '@/app/model/auth/wix-client.base';

/**
 * A single shared Wix client for the whole browser session.
 *
 * Wix requires one client instance across the app: `login()`/`register()` seed a
 * visitor session on this client, and the `sessionToken` they return is bound to
 * that visitor. `getMemberTokensForDirectLogin()` must run on the SAME client so
 * its hidden-iframe `/oauth2/authorize` call carries the matching visitor identity
 * — otherwise Wix rejects the mismatched session token with a 400.
 */
let cachedClient: WixClient | null = null;

/** Build (once) a Wix OAuth client for client components, reading the session from js-cookie. */
export function getBrowserWixClient() {
  if (!cachedClient) {
    cachedClient = getWixClient({ cookieStore: { get: (name) => Cookies.get(name) } });
  }
  return cachedClient;
}

/** Drop the memoized client so the next call rebuilds it from the current cookie (e.g. after logout). */
export function resetBrowserWixClient() {
  cachedClient = null;
}
