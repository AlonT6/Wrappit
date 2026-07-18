import { createClient, OAuthStrategy } from '@wix/sdk';
import { members } from '@wix/members';
import { items } from '@wix/data';
import { WIX_REFRESH_TOKEN } from '@/app/model/auth/auth.const';

/** Minimal cookie reader shared by the server (next/headers) and browser (js-cookie) adapters. */
export type CookieStore = { get(name: string): string | undefined };

const CLIENT_ID = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;

/** Parse the persisted refresh token, if any. Returns the raw object OAuthStrategy expects. */
function getRefreshToken(cookieStore: CookieStore) {
  const raw = cookieStore.get(WIX_REFRESH_TOKEN);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    // Ignore an empty/garbage cookie ({} or missing value).
    return parsed && parsed.value ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build a Wix OAuth client (visitor or member) from a cookie store.
 * The access token is left empty and regenerated on demand from the refresh token,
 * so both SSR and browser renders share the same session via the WIX_REFRESH_TOKEN cookie.
 * Returns null if the public client id is not configured yet.
 */
export function getWixClient({ cookieStore }: { cookieStore: CookieStore }) {
  if (!CLIENT_ID) return null;
  const refreshToken = getRefreshToken(cookieStore);
  return createClient({
    modules: { members, items },
    auth: OAuthStrategy({
      clientId: CLIENT_ID,
      ...(refreshToken
        ? { tokens: { refreshToken, accessToken: { value: '', expiresAt: 0 } } }
        : {}),
    }),
  });
}

export type WixClient = NonNullable<ReturnType<typeof getWixClient>>;
