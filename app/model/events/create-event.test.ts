import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent } from './create-event';
import type { EventInput } from './event.types';

const INPUT: EventInput = {
  childName: 'Maya',
  partyDate: '2026-08-15',
  location: 'Park',
  paymentLinks: [],
  status: 'draft',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('createEvent', () => {
  it('returns the event on 201', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { event: { _id: 'e1' } }));
    const res = await createEvent(INPUT);
    expect(res).toEqual({ ok: true, event: { _id: 'e1' } });
  });

  it('posts JSON to /api/events', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { event: {} }));
    await createEvent(INPUT);
    expect(spy).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST' }));
    const init = spy.mock.calls[0][1]!;
    expect(JSON.parse(init.body as string)).toMatchObject({ childName: 'Maya' });
  });

  it('surfaces validation errors on 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(400, { errors: ['Child name is required.'] }),
    );
    const res = await createEvent(INPUT);
    expect(res).toEqual({ ok: false, errors: ['Child name is required.'] });
  });

  it('surfaces a single error message on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, { error: 'You must be logged in.' }));
    const res = await createEvent(INPUT);
    expect(res).toEqual({ ok: false, errors: ['You must be logged in.'] });
  });

  it('falls back to a generic message when the body is unparseable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
    const res = await createEvent(INPUT);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toEqual(['Could not create the event. Please try again.']);
  });

  it('handles a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const res = await createEvent(INPUT);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toEqual(['Could not reach the server. Please try again.']);
  });
});
