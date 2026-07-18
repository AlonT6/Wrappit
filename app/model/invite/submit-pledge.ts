import type { PledgeInput, PledgeResult } from '@/app/model/invite/invite.types';

/**
 * Submit a guest pledge through the server route (POST /api/pledge), which
 * validates the payload and writes the row via the trusted API-key client.
 * A pledge can stand alone (no RSVP), so `rsvpId` is optional.
 */
export async function submitPledge(input: PledgeInput): Promise<PledgeResult> {
  let res: Response;
  try {
    res = await fetch('/api/pledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, errors: ['Could not reach the server. Please try again.'] };
  }

  if (res.status === 201) return { ok: true };

  const fallback = ['Could not save your pledge. Please try again.'];
  try {
    const body = await res.json();
    if (Array.isArray(body.errors) && body.errors.length > 0) return { ok: false, errors: body.errors };
    if (typeof body.error === 'string') return { ok: false, errors: [body.error] };
  } catch {
    // keep the default message
  }
  return { ok: false, errors: fallback };
}
