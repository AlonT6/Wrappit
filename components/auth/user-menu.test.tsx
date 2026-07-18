import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './user-menu';

const { replace, refresh, signOut, useCurrentMember, refreshMember } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  useCurrentMember: vi.fn(),
  refreshMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));
vi.mock('@/app/model/auth/auth.actions', () => ({
  signOut: () => signOut(),
}));
vi.mock('@/app/model/auth/use-current-member', () => ({
  useCurrentMember: () => useCurrentMember(),
  useRefreshCurrentMember: () => refreshMember,
}));

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  signOut.mockClear();
  refreshMember.mockClear();
  useCurrentMember.mockReset();
});

describe('UserMenu label precedence', () => {
  it('prefers the profile nickname', () => {
    useCurrentMember.mockReturnValue({
      data: { profile: { nickname: 'Nick' }, contact: { firstName: 'First' }, loginEmail: 'e@x.com' },
    });
    render(<UserMenu />);
    expect(screen.getByText('Nick')).toBeInTheDocument();
  });

  it('falls back to the contact first name', () => {
    useCurrentMember.mockReturnValue({
      data: { contact: { firstName: 'First' }, loginEmail: 'e@x.com' },
    });
    render(<UserMenu />);
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('falls back to the login email', () => {
    useCurrentMember.mockReturnValue({ data: { loginEmail: 'e@x.com' } });
    render(<UserMenu />);
    expect(screen.getByText('e@x.com')).toBeInTheDocument();
  });

  it('falls back to "Account" when nothing is set', () => {
    useCurrentMember.mockReturnValue({ data: {} });
    render(<UserMenu />);
    expect(screen.getByText('Account')).toBeInTheDocument();
  });
});

describe('UserMenu logout', () => {
  it('signs out, refreshes the member, and returns home', async () => {
    useCurrentMember.mockReturnValue({ data: { loginEmail: 'e@x.com' } });
    render(<UserMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(refreshMember).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/');
    expect(refresh).toHaveBeenCalled();
  });
});
