import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireMember } from './require-member';

const { replace, useCurrentMember } = vi.hoisted(() => ({
  replace: vi.fn(),
  useCurrentMember: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard',
}));
vi.mock('@/app/model/auth/use-current-member', () => ({
  useCurrentMember: () => useCurrentMember(),
}));

const MEMBER = { _id: 'm1' };

function child() {
  return <div>protected content</div>;
}

beforeEach(() => {
  replace.mockClear();
  useCurrentMember.mockReset();
});

describe('RequireMember', () => {
  it('shows a loading state and does not redirect while the session is fetching', () => {
    useCurrentMember.mockReturnValue({ data: undefined, isFetching: true });
    render(<RequireMember>{child()}</RequireMember>);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not redirect while a refetch is in flight over a stale cached null', () => {
    // The dashboard-bounce scenario at the unit level: data is a stale null but a
    // refetch is running (isFetching), so the gate must wait, not redirect.
    useCurrentMember.mockReturnValue({ data: null, isFetching: true });
    render(<RequireMember>{child()}</RequireMember>);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders children for a member', () => {
    useCurrentMember.mockReturnValue({ data: MEMBER, isFetching: false });
    render(<RequireMember>{child()}</RequireMember>);
    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects an anonymous visitor to /login with an encoded redirect back', () => {
    useCurrentMember.mockReturnValue({ data: null, isFetching: false });
    render(<RequireMember>{child()}</RequireMember>);
    expect(replace).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('transitions loading → children once a member resolves (no stuck spinner, no redirect)', () => {
    useCurrentMember.mockReturnValue({ data: undefined, isFetching: true });
    const { rerender } = render(<RequireMember>{child()}</RequireMember>);
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    useCurrentMember.mockReturnValue({ data: MEMBER, isFetching: false });
    rerender(<RequireMember>{child()}</RequireMember>);

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
