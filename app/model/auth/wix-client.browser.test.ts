import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cookies from 'js-cookie';
import { getBrowserWixClient, resetBrowserWixClient } from './wix-client.browser';
import { getWixClient } from './wix-client.base';

vi.mock('js-cookie', () => ({ default: { get: vi.fn() } }));
vi.mock('./wix-client.base', () => ({ getWixClient: vi.fn(() => 'client') }));

beforeEach(() => {
  vi.mocked(getWixClient).mockClear();
  vi.mocked(Cookies.get).mockReset();
  resetBrowserWixClient(); // clear the shared singleton between tests
});

describe('getBrowserWixClient', () => {
  it('delegates to getWixClient with a js-cookie-backed store', () => {
    const result = getBrowserWixClient();
    expect(result).toBe('client');
    expect(getWixClient).toHaveBeenCalledTimes(1);
  });

  it('reuses one shared client instance across calls', () => {
    const a = getBrowserWixClient();
    const b = getBrowserWixClient();
    expect(a).toBe(b);
    // Wix binds the login sessionToken to this client's visitor session, so
    // getMemberTokensForDirectLogin must run on the same instance — built once.
    expect(getWixClient).toHaveBeenCalledTimes(1);
  });

  it('rebuilds after reset (e.g. logout)', () => {
    getBrowserWixClient();
    resetBrowserWixClient();
    getBrowserWixClient();
    expect(getWixClient).toHaveBeenCalledTimes(2);
  });

  it('the cookie store reads through js-cookie', () => {
    vi.mocked(Cookies.get).mockReturnValue('cookie-value' as unknown as ReturnType<typeof Cookies.get>);
    getBrowserWixClient();
    const { cookieStore } = vi.mocked(getWixClient).mock.calls[0][0];
    expect(cookieStore.get('wix_refreshToken')).toBe('cookie-value');
    expect(Cookies.get).toHaveBeenCalledWith('wix_refreshToken');
  });
});
