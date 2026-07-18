import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupPage from './page';

const { replace, refresh, signUp, verifyEmail, refreshMember } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signUp: vi.fn(),
  verifyEmail: vi.fn(),
  refreshMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));
vi.mock('@/app/model/auth/auth.actions', () => ({
  signUp: (p: unknown) => signUp(p),
  verifyEmail: (code: string, token: string) => verifyEmail(code, token),
}));
vi.mock('@/app/model/auth/use-current-member', () => ({
  useRefreshCurrentMember: () => refreshMember,
}));
// next/link needs app-router context we don't mount; render a plain anchor.
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

async function fillSignup() {
  await userEvent.type(screen.getByLabelText('First name'), 'Ada');
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
  await userEvent.type(screen.getByLabelText('Password'), 'password1');
  await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
}

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  refreshMember.mockClear();
  signUp.mockReset();
  verifyEmail.mockReset();
});

describe('SignupPage', () => {
  it('goes straight to the dashboard when signup succeeds without verification', async () => {
    signUp.mockResolvedValue({ status: 'success' });
    render(<SignupPage />);
    await fillSignup();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(refreshMember).toHaveBeenCalled();
  });

  it('shows the verification-code step, then lands on the dashboard after a valid code', async () => {
    signUp.mockResolvedValue({ status: 'verification-required', stateToken: 'state-1' });
    verifyEmail.mockResolvedValue({ status: 'success' });
    render(<SignupPage />);
    await fillSignup();

    // Second step appears.
    const codeInput = await screen.findByLabelText('Verification code');
    expect(screen.getByText('Check your email')).toBeInTheDocument();

    await userEvent.type(codeInput, '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledWith('123456', 'state-1'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows an error when signup fails', async () => {
    signUp.mockResolvedValue({
      status: 'error',
      message: 'An account with this email already exists. Try logging in.',
    });
    render(<SignupPage />);
    await fillSignup();
    expect(
      await screen.findByText('An account with this email already exists. Try logging in.'),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows a generic message when signup throws', async () => {
    signUp.mockRejectedValue(new Error('network'));
    render(<SignupPage />);
    await fillSignup();
    expect(
      await screen.findByText('Could not reach the server. Please try again.'),
    ).toBeInTheDocument();
  });

  it('shows a generic message when verification throws', async () => {
    signUp.mockResolvedValue({ status: 'verification-required', stateToken: 'state-1' });
    verifyEmail.mockRejectedValue(new Error('network'));
    render(<SignupPage />);
    await fillSignup();
    const codeInput = await screen.findByLabelText('Verification code');
    await userEvent.type(codeInput, '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(
      await screen.findByText('Could not reach the server. Please try again.'),
    ).toBeInTheDocument();
  });

  it('shows an error when the verification code is rejected', async () => {
    signUp.mockResolvedValue({ status: 'verification-required', stateToken: 'state-1' });
    verifyEmail.mockResolvedValue({ status: 'error', message: 'That code was not accepted.' });
    render(<SignupPage />);
    await fillSignup();

    const codeInput = await screen.findByLabelText('Verification code');
    await userEvent.type(codeInput, '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByText('That code was not accepted.')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
