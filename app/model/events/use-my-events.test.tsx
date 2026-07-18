import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyEvents } from './use-my-events';
import { COLLECTIONS } from '@/app/model/collections';

const { getBrowserWixClient, find, query } = vi.hoisted(() => {
  const find = vi.fn();
  const query = vi.fn(() => ({ find }));
  return { getBrowserWixClient: vi.fn(), find, query };
});
vi.mock('@/app/model/auth/wix-client.browser', () => ({
  getBrowserWixClient: () => getBrowserWixClient(),
}));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  getBrowserWixClient.mockReset();
  query.mockClear();
  find.mockReset();
});

describe('useMyEvents', () => {
  it('queries the events collection and returns the items', async () => {
    const events = [{ _id: 'a', childName: 'Maya' }];
    find.mockResolvedValue({ items: events });
    getBrowserWixClient.mockReturnValue({ items: { query } });

    const { result } = renderHook(() => useMyEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(query).toHaveBeenCalledWith(COLLECTIONS.events);
    expect(result.current.data).toEqual(events);
  });

  it('returns an empty list when the client is not configured', async () => {
    getBrowserWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useMyEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('tolerates a missing items array', async () => {
    find.mockResolvedValue({});
    getBrowserWixClient.mockReturnValue({ items: { query } });
    const { result } = renderHook(() => useMyEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});
