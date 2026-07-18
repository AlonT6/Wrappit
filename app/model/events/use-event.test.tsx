import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvent } from './use-event';
import { COLLECTIONS } from '@/app/model/collections';

const { getBrowserWixClient, get } = vi.hoisted(() => ({
  getBrowserWixClient: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@/app/model/auth/wix-client.browser', () => ({
  getBrowserWixClient: () => getBrowserWixClient(),
}));

const MEMBER_ID = 'member-123';

function mockClient(memberId: string | null) {
  return {
    items: { get },
    members: {
      getCurrentMember: () =>
        memberId
          ? Promise.resolve({ member: { _id: memberId } })
          : Promise.reject(new Error('visitor')),
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
  get.mockReset();
});

describe('useEvent', () => {
  it('returns the event when the caller owns it (_owner matches)', async () => {
    const event = { _id: 'evt-1', childName: 'Maya', _owner: MEMBER_ID };
    get.mockResolvedValue(event);
    getBrowserWixClient.mockReturnValue(mockClient(MEMBER_ID));

    const { result } = renderHook(() => useEvent('evt-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(get).toHaveBeenCalledWith(COLLECTIONS.events, 'evt-1');
    expect(result.current.data).toEqual(event);
  });

  it('returns null when the row is owned by a different member', async () => {
    get.mockResolvedValue({ _id: 'evt-1', childName: 'Maya', _owner: 'someone-else' });
    getBrowserWixClient.mockReturnValue(mockClient(MEMBER_ID));

    const { result } = renderHook(() => useEvent('evt-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('returns null when there is no logged-in member', async () => {
    get.mockResolvedValue({ _id: 'evt-1', _owner: MEMBER_ID });
    getBrowserWixClient.mockReturnValue(mockClient(null));

    const { result } = renderHook(() => useEvent('evt-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('unwraps the { dataItem } response shape and checks ownership', async () => {
    get.mockResolvedValue({ dataItem: { _id: 'evt-1', childName: 'Maya', _owner: MEMBER_ID } });
    getBrowserWixClient.mockReturnValue(mockClient(MEMBER_ID));

    const { result } = renderHook(() => useEvent('evt-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ _id: 'evt-1', childName: 'Maya', _owner: MEMBER_ID });
  });
});
