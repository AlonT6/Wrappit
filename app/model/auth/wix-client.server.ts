import 'server-only';
import { getWixClient, type CookieStore } from '@/app/model/auth/wix-client.base';

/** Shape of the cookie store returned by Next's `cookies()` (from next/headers). */
type ReadonlyRequestCookies = { get(name: string): { value: string } | undefined };

/**
 * Build a Wix OAuth client for server components / route handlers.
 * Usage:  const client = getServerWixClient(await cookies());
 */
export function getServerWixClient(cookieStore: ReadonlyRequestCookies) {
  const adapter: CookieStore = { get: (name) => cookieStore.get(name)?.value };
  return getWixClient({ cookieStore: adapter });
}
