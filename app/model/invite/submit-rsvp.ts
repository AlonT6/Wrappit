import type { RsvpInput, RsvpResult } from '@/app/model/invite/invite.types';

/**
 * Submit a guest RSVP through the server route (POST /api/rsvp), which validates
 * the payload and writes the row via the trusted API-key client. Returns the new
 * rsvp id (so a follow-up pledge can link to it) or a list of inline errors.
 */
export async function submitRsvp(input: RsvpInput): Promise<RsvpResult> {
  let res: Response;
  try {
    res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, errors: ['Could not reach the server. Please try again.'] };
  }

  if (res.status === 201) {
    const { rsvpId } = await res.json();
    return { ok: true, rsvpId };
  }

  return { ok: false, errors: await readErrors(res) };
}

async function readErrors(res: Response): Promise<string[]> {
  const fallback = ['Could not save your RSVP. Please try again.'];
  try {
    const body = await res.json();
    if (Array.isArray(body.errors) && body.errors.length > 0) return body.errors;
    if (typeof body.error === 'string') return [body.error];
  } catch {
    // keep the default message
  }
  return fallback;
}
