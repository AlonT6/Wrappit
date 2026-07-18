import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventSummary } from './use-event-summary';

const { useCurrentMember, fetchMock } = vi.hoisted(() => ({
  useCurrentMember: vi.fn(),
  fetchMock: vi.fn(),
}));
vi.mock('@/app/model/auth/use-current-member', () => ({
  useCurrentMember: () => useCurrentMember(),
}));

const SUMMARY = {
  rsvps: [{ _id: 'r1', eventId: 'evt-1', status: 'yes', inviteeName: 'Kid', parentName: 'Parent' }],
  pledges: [{ _id: 'p1', eventId: 'evt-1', contributorName: 'Alice', amount: 25 }],
  pledgeTotal: 25,
  attendingCount: 1,
  notAttendingCount: 0,
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useCurrentMember.mockReset().mockReturnValue({ data: { _id: 'member-1' } });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('useEventSummary', () => {
  it('loads the summary for the authenticated member', async () => {
    fetchMock.mockResolvedValue({ status: 200, json: async () => SUMMARY });

    const { result } = renderHook(() => useEventSummary('evt-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith('/api/events/evt-1/summary');
    expect(result.current.data).toEqual(SUMMARY);
  });

  it('does not fetch when there is no logged-in member', async () => {
    useCurrentMember.mockReturnValue({ data: null });

    const { result } = renderHook(() => useEventSummary('evt-1'), { wrapper: wrapper() });
    // The query is disabled, so it never leaves the pending/idle state.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces an error when the route responds non-200', async () => {
    fetchMock.mockResolvedValue({ status: 404, json: async () => ({ error: 'Event not found.' }) });

    const { result } = renderHook(() => useEventSummary('evt-1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('Event not found.'));
  });
});
