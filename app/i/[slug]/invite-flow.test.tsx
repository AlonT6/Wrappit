import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteFlow } from './invite-flow';
import type { PublicEvent } from '@/app/model/invite/invite.types';

const { submitRsvp, submitPledge } = vi.hoisted(() => ({
  submitRsvp: vi.fn(),
  submitPledge: vi.fn(),
}));
vi.mock('@/app/model/invite/submit-rsvp', () => ({ submitRsvp: (i: unknown) => submitRsvp(i) }));
vi.mock('@/app/model/invite/submit-pledge', () => ({ submitPledge: (i: unknown) => submitPledge(i) }));

const EVENT: PublicEvent = {
  childName: 'Maya',
  partyDate: '2026-08-15',
  partyTime: '15:00',
  location: 'Sunny Park',
  description: 'Superhero party',
  inviteSlug: 'maya-abc123',
  paymentLinks: [{ type: 'venmo', label: 'Venmo', url: 'https://venmo.com/u/x' }],
};

beforeEach(() => {
  submitRsvp.mockReset().mockResolvedValue({ ok: true, rsvpId: 'rsvp-1' });
  submitPledge.mockReset().mockResolvedValue({ ok: true });
});

describe('InviteFlow', () => {
  it('shows the invite details first', () => {
    render(<InviteFlow event={EVENT} />);
    expect(screen.getByRole('heading', { name: /You're invited to Maya's birthday/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RSVP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chip in for the gift' })).toBeInTheDocument();
  });

  it('completes RSVP → pledge and links the rsvpId', async () => {
    render(<InviteFlow event={EVENT} />);

    await userEvent.click(screen.getByRole('button', { name: 'RSVP' }));
    await userEvent.type(screen.getByLabelText(/Guest name/), 'Ava');
    await userEvent.type(screen.getByLabelText('Parent/guardian name'), 'Sarah');
    await userEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => expect(submitRsvp).toHaveBeenCalled());
    expect(submitRsvp.mock.calls[0][0]).toMatchObject({
      slug: 'maya-abc123',
      inviteeName: 'Ava',
      parentName: 'Sarah',
      attending: true,
    });

    // Now on the pledge step.
    await userEvent.type(screen.getByLabelText('Your name'), 'Sarah');
    await userEvent.type(screen.getByLabelText('Amount'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Record pledge' }));

    await waitFor(() => expect(submitPledge).toHaveBeenCalled());
    expect(submitPledge.mock.calls[0][0]).toMatchObject({
      slug: 'maya-abc123',
      contributorName: 'Sarah',
      amount: 40,
      rsvpId: 'rsvp-1',
    });

    await waitFor(() => expect(screen.getByText(/Thank you/)).toBeInTheDocument());
  });

  it('allows a standalone pledge with no rsvpId', async () => {
    render(<InviteFlow event={EVENT} />);

    await userEvent.click(screen.getByRole('button', { name: 'Chip in for the gift' }));
    await userEvent.type(screen.getByLabelText('Your name'), 'Ruth');
    await userEvent.type(screen.getByLabelText('Amount'), '25');
    await userEvent.click(screen.getByRole('button', { name: 'Record pledge' }));

    await waitFor(() => expect(submitPledge).toHaveBeenCalled());
    expect(submitRsvp).not.toHaveBeenCalled();
    expect(submitPledge.mock.calls[0][0].rsvpId).toBeUndefined();
  });

  it('surfaces server-side RSVP errors and stays on the form', async () => {
    submitRsvp.mockResolvedValue({ ok: false, errors: ['This invite is no longer available.'] });
    render(<InviteFlow event={EVENT} />);

    await userEvent.click(screen.getByRole('button', { name: 'RSVP' }));
    await userEvent.type(screen.getByLabelText(/Guest name/), 'Ava');
    await userEvent.type(screen.getByLabelText('Parent/guardian name'), 'Sarah');
    await userEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => expect(screen.getByText(/no longer available/)).toBeInTheDocument());
    // still on the RSVP form, not advanced to pledge
    expect(screen.getByRole('button', { name: 'Submit RSVP' })).toBeInTheDocument();
    expect(submitPledge).not.toHaveBeenCalled();
  });
});
