import type { EventSummary } from '@/app/model/invite/invite.types';

export type EventSummaryResult =
  | { ok: true; summary: EventSummary }
  | { ok: false; errors: string[] };

/**
 * Fetch the organizer rollup (RSVPs + pledges + total) for one event from the
 * authenticated, owner-gated route GET /api/events/[id]/summary. All the Private
 * collection reads happen server-side; the browser only ever sees this endpoint.
 */
export async function getEventSummary(eventId: string): Promise<EventSummaryResult> {
  let res: Response;
  try {
    res = await fetch(`/api/events/${encodeURIComponent(eventId)}/summary`);
  } catch {
    return { ok: false, errors: ['Could not reach the server. Please try again.'] };
  }

  if (res.status === 200) {
    const summary = (await res.json()) as EventSummary;
    return { ok: true, summary };
  }

  return { ok: false, errors: await readErrors(res) };
}

async function readErrors(res: Response): Promise<string[]> {
  const fallback = ['Could not load the event summary. Please try again.'];
  try {
    const body = await res.json();
    if (Array.isArray(body.errors) && body.errors.length > 0) return body.errors;
    if (typeof body.error === 'string') return [body.error];
  } catch {
    // keep the default message
  }
  return fallback;
}
