import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from './page';

const { sendPasswordReset } = vi.hoisted(() => ({ sendPasswordReset: vi.fn() }));
vi.mock('@/app/model/auth/auth.actions', () => ({
  sendPasswordReset: (email: string) => sendPasswordReset(email),
}));
// next/link needs app-router context we don't mount; render a plain anchor.
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

async function submit(email = 'a@b.com') {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
}

beforeEach(() => {
  sendPasswordReset.mockReset();
});

describe('ForgotPasswordPage', () => {
  it('shows a confirmation once the reset email is sent', async () => {
    sendPasswordReset.mockResolvedValue(undefined);
    render(<ForgotPasswordPage />);
    await submit('a@b.com');
    await waitFor(() => expect(screen.getByText('Check your email')).toBeInTheDocument());
    expect(
      screen.getByText('If an account exists for a@b.com, we sent a password reset link.'),
    ).toBeInTheDocument();
    expect(sendPasswordReset).toHaveBeenCalledWith('a@b.com');
  });

  it('shows an error when sending fails', async () => {
    sendPasswordReset.mockRejectedValue(new Error('boom'));
    render(<ForgotPasswordPage />);
    await submit();
    expect(
      await screen.findByText('Could not send the reset email. Please try again.'),
    ).toBeInTheDocument();
  });
});
