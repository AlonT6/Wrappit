import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventDetail } from './page';

const { useEventSummary } = vi.hoisted(() => ({ useEventSummary: vi.fn() }));
vi.mock('@/app/model/events/use-event-summary', () => ({ useEventSummary: () => useEventSummary() }));
// `useEvent` is only used by the default page export (which unwraps `params` via
// React's `use`); testing `EventDetail` directly with an event prop sidesteps that.
vi.mock('@/app/model/events/use-event', () => ({ useEvent: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

const EVENT = {
  _id: 'evt-1',
  childName: 'Maya',
  partyDate: '2026-08-15',
  location: 'Sunny Park',
  inviteSlug: 'maya-abc123',
  status: 'published' as const,
  paymentLinks: [],
};

beforeEach(() => {
  useEventSummary.mockReset();
});

describe('EventDetail — organizer summary', () => {
  it('shows the pledge total and each RSVP with attending status', () => {
    useEventSummary.mockReturnValue({
      data: {
        rsvps: [
          { _id: 'r1', eventId: 'evt-1', status: 'yes', inviteeName: 'Ari', parentName: 'Dana' },
          { _id: 'r2', eventId: 'evt-1', status: 'no', inviteeName: 'Ben', parentName: 'Ravit' },
        ],
        pledges: [
          { _id: 'p1', eventId: 'evt-1', contributorName: 'Alice', amount: 25 },
          { _id: 'p2', eventId: 'evt-1', contributorName: 'Bob', amount: 15 },
        ],
        pledgeTotal: 40,
        attendingCount: 1,
        notAttendingCount: 1,
      },
      isLoading: false,
      isError: false,
    });

    render(<EventDetail event={EVENT} />);

    expect(screen.getByText('$40')).toBeInTheDocument();
    expect(screen.getByText('Ari')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText("1 attending · 1 can't make it")).toBeInTheDocument();
    expect(screen.getByText('Attending')).toBeInTheDocument();
  });

  it('shows empty states when there are no RSVPs or pledges', () => {
    useEventSummary.mockReturnValue({
      data: { rsvps: [], pledges: [], pledgeTotal: 0, attendingCount: 0, notAttendingCount: 0 },
      isLoading: false,
      isError: false,
    });

    render(<EventDetail event={EVENT} />);

    expect(screen.getByText('No RSVPs yet.')).toBeInTheDocument();
    expect(screen.getByText('No pledges yet.')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('shows a loading line while the summary loads', () => {
    useEventSummary.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<EventDetail event={EVENT} />);
    expect(screen.getByText('Loading RSVPs and pledges…')).toBeInTheDocument();
  });

  it('shows an error line when the summary fails to load', () => {
    useEventSummary.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<EventDetail event={EVENT} />);
    expect(
      screen.getByText("Couldn't load RSVPs and pledges. Please refresh to try again."),
    ).toBeInTheDocument();
  });

  it('renders a copyable suggested share message with the invite url', () => {
    useEventSummary.mockReturnValue({
      data: { rsvps: [], pledges: [], pledgeTotal: 0, attendingCount: 0, notAttendingCount: 0 },
      isLoading: false,
      isError: false,
    });
    render(<EventDetail event={EVENT} />);
    // The share message (unique to the share-text card) includes the invite url.
    expect(
      screen.getByText(/Please RSVP and chip in for the group gift here: .*\/i\/maya-abc123/),
    ).toBeInTheDocument();
  });
});
