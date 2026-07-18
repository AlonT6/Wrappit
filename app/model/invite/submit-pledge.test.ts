import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitPledge } from './submit-pledge';
import type { PledgeInput } from './invite.types';

const INPUT: PledgeInput = { slug: 'maya-abc123', contributorName: 'Ruth', amount: 50 };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('submitPledge', () => {
  it('returns ok on 201', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { ok: true }));
    expect(await submitPledge(INPUT)).toEqual({ ok: true });
  });

  it('posts JSON to /api/pledge', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { ok: true }));
    await submitPledge(INPUT);
    expect(spy).toHaveBeenCalledWith('/api/pledge', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toMatchObject({ amount: 50 });
  });

  it('surfaces validation errors on 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(400, { errors: ['bad amount'] }));
    expect(await submitPledge(INPUT)).toEqual({ ok: false, errors: ['bad amount'] });
  });

  it('handles a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect((await submitPledge(INPUT)).ok).toBe(false);
  });
});
