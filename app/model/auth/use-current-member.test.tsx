import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCurrentMember,
  useRefreshCurrentMember,
  currentMemberQueryKey,
} from './use-current-member';

const { getBrowserWixClient } = vi.hoisted(() => ({ getBrowserWixClient: vi.fn() }));
vi.mock('@/app/model/auth/wix-client.browser', () => ({
  getBrowserWixClient: () => getBrowserWixClient(),
}));

const MEMBER = { _id: 'm1', loginEmail: 'a@b.com' };

/** Fresh client per test with a controllable getCurrentMember. */
function clientWith(getCurrentMember: () => unknown) {
  return { members: { getCurrentMember } };
}

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  getBrowserWixClient.mockReset();
});

describe('useCurrentMember', () => {
  it('returns the member when getCurrentMember resolves with one', async () => {
    getBrowserWixClient.mockReturnValue(
      clientWith(vi.fn().mockResolvedValue({ member: MEMBER })),
    );
    const { result } = renderHook(() => useCurrentMember(), { wrapper: wrapper(newQueryClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(MEMBER);
  });

  it('returns null when the response has no member', async () => {
    getBrowserWixClient.mockReturnValue(
      clientWith(vi.fn().mockResolvedValue({ member: undefined })),
    );
    const { result } = renderHook(() => useCurrentMember(), { wrapper: wrapper(newQueryClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('returns null (never throws) when getCurrentMember rejects — a visitor session', async () => {
    getBrowserWixClient.mockReturnValue(
      clientWith(vi.fn().mockRejectedValue(new Error('not a member'))),
    );
    const { result } = renderHook(() => useCurrentMember(), { wrapper: wrapper(newQueryClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('returns null when the client is not configured', async () => {
    getBrowserWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useCurrentMember(), { wrapper: wrapper(newQueryClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('does not retry a caught failure (queryFn resolves once)', async () => {
    const getCurrentMember = vi.fn().mockRejectedValue(new Error('nope'));
    getBrowserWixClient.mockReturnValue(clientWith(getCurrentMember));
    const { result } = renderHook(() => useCurrentMember(), { wrapper: wrapper(newQueryClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Caught inside fetchCurrentMember → the query resolves, so it runs exactly once.
    expect(getCurrentMember).toHaveBeenCalledTimes(1);
  });
});

describe('useRefreshCurrentMember', () => {
  it('invalidates exactly the current-member query', async () => {
    const queryClient = newQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRefreshCurrentMember(), {
      wrapper: wrapper(queryClient),
    });
    await result.current();
    expect(spy).toHaveBeenCalledWith({ queryKey: currentMemberQueryKey });
  });
});
