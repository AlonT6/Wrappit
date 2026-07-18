import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitRsvp } from './submit-rsvp';
import type { RsvpInput } from './invite.types';

const INPUT: RsvpInput = {
  slug: 'maya-abc123',
  inviteeName: 'Ava',
  attending: true,
  parentName: 'Sarah',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('submitRsvp', () => {
  it('returns the rsvpId on 201', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { rsvpId: 'rsvp-1' }));
    expect(await submitRsvp(INPUT)).toEqual({ ok: true, rsvpId: 'rsvp-1' });
  });

  it('posts JSON to /api/rsvp', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { rsvpId: 'x' }));
    await submitRsvp(INPUT);
    expect(spy).toHaveBeenCalledWith('/api/rsvp', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toMatchObject({ inviteeName: 'Ava' });
  });

  it('surfaces validation errors on 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(400, { errors: ['bad'] }));
    expect(await submitRsvp(INPUT)).toEqual({ ok: false, errors: ['bad'] });
  });

  it('handles a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const res = await submitRsvp(INPUT);
    expect(res.ok).toBe(false);
  });
});
