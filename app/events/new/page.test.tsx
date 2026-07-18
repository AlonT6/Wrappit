import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewEventPage from './page';

const { push, createEvent } = vi.hoisted(() => ({ push: vi.fn(), createEvent: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/app/model/events/create-event', () => ({ createEvent: (i: unknown) => createEvent(i) }));

const DRAFT_KEY = 'wrappit:new-event-draft';

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <NewEventPage />
    </QueryClientProvider>,
  );
}

async function fillRequired() {
  await userEvent.type(screen.getByLabelText("Child's name"), 'Maya');
  await userEvent.type(screen.getByLabelText('Party date'), '2026-08-15');
  await userEvent.type(screen.getByLabelText('Location'), 'Sunny Park');
}

beforeEach(() => {
  push.mockClear();
  createEvent.mockReset();
  window.localStorage.clear();
});

describe('NewEventPage', () => {
  it('submits the assembled input and, on success, clears the draft and navigates to the event', async () => {
    createEvent.mockResolvedValue({ ok: true, event: { _id: 'evt-9' } });
    renderPage();
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    const input = createEvent.mock.calls[0][0];
    expect(input).toMatchObject({
      childName: 'Maya',
      partyDate: '2026-08-15',
      location: 'Sunny Park',
      status: 'draft',
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/events/evt-9'));
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('sends status "published" when the publish box is checked', async () => {
    createEvent.mockResolvedValue({ ok: true, event: { _id: 'e1' } });
    renderPage();
    await fillRequired();
    await userEvent.click(screen.getByLabelText(/Publish now/));
    await userEvent.click(screen.getByRole('button', { name: 'Create event' }));
    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    expect(createEvent.mock.calls[0][0].status).toBe('published');
  });

  it('autosaves the draft to localStorage as the user types', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText("Child's name"), 'Maya');
    await waitFor(() => {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).childName).toBe('Maya');
    });
  });

  it('restores an autosaved draft on mount', async () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ childName: 'Restored' }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText("Child's name")).toHaveValue('Restored'),
    );
  });

  it('shows server validation errors and does not navigate', async () => {
    createEvent.mockResolvedValue({ ok: false, errors: ['Child name is required.'] });
    renderPage();
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Create event' }));
    expect(await screen.findByText('Child name is required.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('lets the user add and remove payment-link rows', async () => {
    renderPage();
    expect(screen.getByLabelText('Payment method 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add payment link' }));
    expect(screen.getByLabelText('Payment method 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove payment link 2' }));
    expect(screen.queryByLabelText('Payment method 2')).not.toBeInTheDocument();
  });
});
