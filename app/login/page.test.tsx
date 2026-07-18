import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

const h = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
  refreshMember: vi.fn().mockResolvedValue(undefined),
  redirectParam: null as string | null,
}));
const { replace, refresh, signIn, refreshMember } = h;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: h.replace, refresh: h.refresh, push: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'redirect' ? h.redirectParam : null) }),
}));
vi.mock('@/app/model/auth/auth.actions', () => ({ signIn: (p: unknown) => h.signIn(p) }));
vi.mock('@/app/model/auth/use-current-member', () => ({
  useRefreshCurrentMember: () => h.refreshMember,
}));
// next/link needs app-router context we don't mount; render a plain anchor.
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
  await userEvent.type(screen.getByLabelText('Password'), 'password1');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  refreshMember.mockClear();
  signIn.mockReset();
  h.redirectParam = null;
});

describe('LoginPage', () => {
  it('on success refreshes the member and navigates to /dashboard by default', async () => {
    signIn.mockResolvedValue({ status: 'success' });
    render(<LoginPage />);
    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(refreshMember).toHaveBeenCalled();
    expect(signIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password1' });
  });

  it('honors the ?redirect= param', async () => {
    h.redirectParam = '/events/new';
    signIn.mockResolvedValue({ status: 'success' });
    render(<LoginPage />);
    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/events/new'));
  });

  it('shows a verify-email notice when verification is required', async () => {
    signIn.mockResolvedValue({ status: 'verification-required', stateToken: 's' });
    render(<LoginPage />);
    await fillAndSubmit();
    expect(
      await screen.findByText('Please verify your email before logging in.'),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows the error message on failure', async () => {
    signIn.mockResolvedValue({ status: 'error', message: 'Incorrect email or password.' });
    render(<LoginPage />);
    await fillAndSubmit();
    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
  });

  it('shows a generic message when the call throws', async () => {
    signIn.mockRejectedValue(new Error('network'));
    render(<LoginPage />);
    await fillAndSubmit();
    expect(
      await screen.findByText('Could not reach the server. Please try again.'),
    ).toBeInTheDocument();
  });
});
