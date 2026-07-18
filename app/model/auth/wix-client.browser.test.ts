import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cookies from 'js-cookie';
import { getBrowserWixClient } from './wix-client.browser';
import { getWixClient } from './wix-client.base';

vi.mock('js-cookie', () => ({ default: { get: vi.fn() } }));
vi.mock('./wix-client.base', () => ({ getWixClient: vi.fn(() => 'client') }));

beforeEach(() => {
  vi.mocked(getWixClient).mockClear();
  vi.mocked(Cookies.get).mockReset();
});

describe('getBrowserWixClient', () => {
  it('delegates to getWixClient with a js-cookie-backed store', () => {
    const result = getBrowserWixClient();
    expect(result).toBe('client');
    expect(getWixClient).toHaveBeenCalledTimes(1);
  });

  it('the cookie store reads through js-cookie', () => {
    vi.mocked(Cookies.get).mockReturnValue('cookie-value' as unknown as ReturnType<typeof Cookies.get>);
    getBrowserWixClient();
    const { cookieStore } = vi.mocked(getWixClient).mock.calls[0][0];
    expect(cookieStore.get('wix_refreshToken')).toBe('cookie-value');
    expect(Cookies.get).toHaveBeenCalledWith('wix_refreshToken');
  });
});
