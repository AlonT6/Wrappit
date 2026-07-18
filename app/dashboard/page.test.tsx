import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

const { useCurrentMember, useMyEvents } = vi.hoisted(() => ({
  useCurrentMember: vi.fn(),
  useMyEvents: vi.fn(),
}));
vi.mock('@/app/model/auth/use-current-member', () => ({ useCurrentMember: () => useCurrentMember() }));
vi.mock('@/app/model/events/use-my-events', () => ({ useMyEvents: () => useMyEvents() }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

beforeEach(() => {
  useCurrentMember.mockReturnValue({ data: { contact: { firstName: 'Ada' } } });
  useMyEvents.mockReset();
});

describe('DashboardPage', () => {
  it('shows a loading line while events load', () => {
    useMyEvents.mockReturnValue({ data: undefined, isLoading: true });
    render(<DashboardPage />);
    expect(screen.getByText('Loading your events…')).toBeInTheDocument();
  });

  it('shows the empty state with a create CTA when there are no events', () => {
    useMyEvents.mockReturnValue({ data: [], isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByText('No events yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first event' })).toHaveAttribute(
      'href',
      '/events/new',
    );
  });

  it('lists the member events with name, date and status, linking to detail', () => {
    useMyEvents.mockReturnValue({
      data: [
        { _id: 'e1', childName: 'Maya', partyDate: '2026-08-15', status: 'published' },
        { _id: 'e2', childName: 'Sam', partyDate: '2026-09-01', status: 'draft' },
      ],
      isLoading: false,
    });
    render(<DashboardPage />);

    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    // Row links to the detail page.
    const link = screen.getByText('Maya').closest('a');
    expect(link).toHaveAttribute('href', '/events/e1');
  });

  it('greets the member by first name', () => {
    useMyEvents.mockReturnValue({ data: [], isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByText('Welcome, Ada')).toBeInTheDocument();
  });
});
