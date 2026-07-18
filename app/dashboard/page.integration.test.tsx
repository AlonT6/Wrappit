/**
 * Integration test for the dashboard as the user actually sees it after login:
 * the REAL page rendered inside its REAL layout chrome (AppChrome -> RequireMember
 * + UserMenu -> DashboardPage), wired to REAL hooks (useCurrentMember, useMyEvents)
 * and a real QueryClient. Only the Wix client is mocked at the edge.
 *
 * The existing page.test.tsx renders DashboardPage in isolation with both hooks
 * mocked, so it never exercises this tree — which is where "the dashboard crashes
 * after login" lives.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppChrome } from '@/components/app-chrome';
import DashboardPage from './page';

const { replace, getBrowserWixClient } = vi.hoisted(() => ({
  replace: vi.fn(),
  getBrowserWixClient: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard',
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
vi.mock('@/app/model/auth/wix-client.browser', () => ({
  getBrowserWixClient: () => getBrowserWixClient(),
}));

const MEMBER = {
  _id: 'm1',
  loginEmail: 'ada@example.com',
  contact: { firstName: 'Ada' },
};

const EVENTS = [
  {
    _id: 'e1',
    childName: 'Maya',
    partyDate: '2026-08-15',
    status: 'published',
    inviteSlug: 'maya-abc',
    location: 'Home',
    paymentLinks: [],
  },
];

/** A logged-in member whose events query resolves a real row. */
function loggedInClient() {
  return {
    members: { getCurrentMember: vi.fn().mockResolvedValue({ member: MEMBER }) },
    items: { query: vi.fn(() => ({ find: vi.fn().mockResolvedValue({ items: EVENTS }) })) },
  };
}

function renderDashboard(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <AppChrome>
        <DashboardPage />
      </AppChrome>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockClear();
  getBrowserWixClient.mockReset();
});

describe('dashboard after login — full chrome + real hooks', () => {
  it('renders the member greeting and their events without crashing', async () => {
    getBrowserWixClient.mockReturnValue(loggedInClient());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderDashboard(client);

    expect(await screen.findByText('Welcome, Ada')).toBeInTheDocument();
    expect(await screen.findByText('Maya')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
