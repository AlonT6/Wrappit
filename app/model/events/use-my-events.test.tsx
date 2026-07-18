import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyEvents } from './use-my-events';
import { COLLECTIONS } from '@/app/model/collections';

const { getBrowserWixClient, find, eq, query, getCurrentMember } = vi.hoisted(() => {
  const find = vi.fn();
  const eq = vi.fn(() => ({ find }));
  const query = vi.fn(() => ({ eq }));
  const getCurrentMember = vi.fn();
  return { getBrowserWixClient: vi.fn(), find, eq, query, getCurrentMember };
});
vi.mock('@/app/model/auth/wix-client.browser', () => ({
  getBrowserWixClient: () => getBrowserWixClient(),
}));

const MEMBER_ID = 'member-123';

/** A mock Wix client that reports the given member and serves the query chain. */
function mockClient(memberId: string | null = MEMBER_ID) {
  return {
    items: { query },
    members: {
      getCurrentMember: () =>
        getCurrentMember() ??
        (memberId ? Promise.resolve({ member: { _id: memberId } }) : Promise.reject(new Error('visitor'))),
    },
  };
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  getBrowserWixClient.mockReset();
  query.mockClear();
  eq.mockClear();
  find.mockReset();
  getCurrentMember.mockReset();
  // Default: no override — mockClient falls back to its own resolution.
  getCurrentMember.mockReturnValue(undefined);
});

describe('useMyEvents', () => {
  it('scopes the query to the current member (_owner filter) and returns the items', async () => {
    const events = [{ _id: 'a', childName: 'Maya', _owner: MEMBER_ID }];
    find.mockResolvedValue({ items: events });
    getBrowserWixClient.mockReturnValue(mockClient(MEMBER_ID));

    const { result } = renderHook(() => useMyEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toEqual(events));

    expect(query).toHaveBeenCalledWith(COLLECTIONS.events);
    expect(eq).toHaveBeenCalledWith('_owner', MEMBER_ID);
  });

  it('returns an empty list (and never queries) when there is no member', async () => {
    getBrowserWixClient.mockReturnValue(mockClient(null));
    const { result } = renderHook(() => useMyEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(query).not.toHaveBeenCalled();
  });

  it('returns an empty list when the client is not configured', async () => {
    getBrowserWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useMyEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('tolerates a missing items array', async () => {
    find.mockResolvedValue({});
    getBrowserWixClient.mockReturnValue(mockClient(MEMBER_ID));
    const { result } = renderHook(() => useMyEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });
});
