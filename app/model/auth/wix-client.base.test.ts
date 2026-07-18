import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CookieStore } from './wix-client.base';

// Capture what the SDK is constructed with, without pulling in the real Wix SDK.
// vi.hoisted so the spies exist before the (hoisted) vi.mock factory runs.
const sdk = vi.hoisted(() => ({
  oauthStrategy: vi.fn((opts: unknown) => ({ __oauth: opts })),
  createClient: vi.fn((opts: unknown) => ({ __client: opts })),
}));

vi.mock('@wix/sdk', () => ({
  createClient: (opts: unknown) => sdk.createClient(opts),
  OAuthStrategy: (opts: unknown) => sdk.oauthStrategy(opts),
}));
vi.mock('@wix/members', () => ({ members: { __members: true } }));

/** Cookie store whose single cookie returns `value` (or nothing). */
function cookieStore(value?: string): CookieStore {
  return { get: () => value };
}

/** The options `OAuthStrategy` was constructed with on the most recent call. */
function lastOAuthOpts() {
  return sdk.oauthStrategy.mock.calls.at(-1)?.[0] as {
    clientId: string;
    tokens?: { refreshToken: unknown; accessToken: { value: string; expiresAt: number } };
  };
}

beforeEach(() => {
  sdk.oauthStrategy.mockClear();
  sdk.createClient.mockClear();
});

describe('getWixClient', () => {
  it('returns null when the public client id is not configured', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_WIX_CLIENT_ID', '');
    const { getWixClient } = await import('./wix-client.base');
    expect(getWixClient({ cookieStore: cookieStore() })).toBeNull();
    expect(sdk.createClient).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds a visitor client (no tokens) when no refresh-token cookie is present', async () => {
    const { getWixClient } = await import('./wix-client.base');
    getWixClient({ cookieStore: cookieStore(undefined) });
    expect(sdk.createClient).toHaveBeenCalledTimes(1);
    const opts = lastOAuthOpts();
    expect(opts.clientId).toBe('test-client-id');
    expect(opts.tokens).toBeUndefined();
  });

  it('passes the refresh token when the cookie holds a valid token', async () => {
    const { getWixClient } = await import('./wix-client.base');
    const refreshToken = { value: 'ref-123', role: 'member' };
    getWixClient({ cookieStore: cookieStore(JSON.stringify(refreshToken)) });
    const opts = lastOAuthOpts();
    expect(opts.tokens).toEqual({
      refreshToken,
      accessToken: { value: '', expiresAt: 0 },
    });
  });

  it('ignores an empty ({}) cookie and builds a visitor client', async () => {
    const { getWixClient } = await import('./wix-client.base');
    getWixClient({ cookieStore: cookieStore(JSON.stringify({})) });
    expect(lastOAuthOpts().tokens).toBeUndefined();
  });

  it('ignores non-JSON garbage in the cookie', async () => {
    const { getWixClient } = await import('./wix-client.base');
    getWixClient({ cookieStore: cookieStore('not-json') });
    expect(lastOAuthOpts().tokens).toBeUndefined();
  });
});
