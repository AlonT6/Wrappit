/**
 * Regression test for the "dashboard doesn't load" bug.
 *
 * Unlike require-member.test.tsx (which mocks useCurrentMember), this wires the REAL
 * useCurrentMember + a real QueryClient to the gate, and only mocks the Wix client at
 * the edge — that's what surfaces the bug, which lived in the interaction between
 * TanStack Query's cache semantics and RequireMember's redirect condition.
 *
 * Root cause: RequireMember used to redirect on `!isLoading && !member`. After login,
 * the query holds a STALE cached visitor `null` (isLoading=false) while a refetch is in
 * flight, so the gate bounced a real member back to /login. Fixed by gating on
 * `isFetching` instead. These tests now assert the corrected behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequireMember } from './require-member';
import { currentMemberQueryKey } from '@/app/model/auth/use-current-member';

const { replace, getBrowserWixClient } = vi.hoisted(() => ({
  replace: vi.fn(),
  getBrowserWixClient: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard',
}));
vi.mock('@/app/model/auth/wix-client.browser', () => ({
  getBrowserWixClient: () => getBrowserWixClient(),
}));

const MEMBER = { _id: 'm1', loginEmail: 'a@b.com' };

/** A real member session: the Wix client resolves a member. */
function memberClient() {
  return { members: { getCurrentMember: vi.fn().mockResolvedValue({ member: MEMBER }) } };
}

function renderGate(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <RequireMember>
        <div>protected content</div>
      </RequireMember>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockClear();
  getBrowserWixClient.mockReset();
});

describe('dashboard load — RequireMember + real useCurrentMember', () => {
  it('cold load (no cache): fetches the member and renders the dashboard', async () => {
    getBrowserWixClient.mockReturnValue(memberClient());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderGate(client);

    expect(await screen.findByText('protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does NOT bounce a real logged-in member when a stale visitor `null` is cached', async () => {
    // A real member is logged in — getCurrentMember would return them.
    getBrowserWixClient.mockReturnValue(memberClient());

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Reproduce the common path: visiting /dashboard anonymously first cached `null`,
    // then login's refreshMember() invalidated it (marking it stale but not refetching,
    // because no observer is mounted on the /login page).
    client.setQueryData(currentMemberQueryKey, null);
    await client.invalidateQueries({ queryKey: currentMemberQueryKey });

    renderGate(client);

    // The gate must wait for the in-flight refetch (isFetching) rather than acting on
    // the stale null, then render the dashboard once the member resolves.
    expect(await screen.findByText('protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
