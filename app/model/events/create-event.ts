import type { EventInput, WrappitEvent } from '@/app/model/events/event.types';

export type CreateEventResult =
  | { ok: true; event: WrappitEvent }
  | { ok: false; errors: string[] };

/**
 * Create an event through the server route (POST /api/events), which authenticates
 * the member and writes the row. Returns the created event or a list of errors the
 * form can show inline.
 */
export async function createEvent(input: EventInput): Promise<CreateEventResult> {
  let res: Response;
  try {
    res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, errors: ['Could not reach the server. Please try again.'] };
  }

  if (res.status === 201) {
    const { event } = await res.json();
    return { ok: true, event };
  }

  let errors = ['Could not create the event. Please try again.'];
  try {
    const body = await res.json();
    if (Array.isArray(body.errors) && body.errors.length > 0) errors = body.errors;
    else if (typeof body.error === 'string') errors = [body.error];
  } catch {
    // keep the default message
  }
  return { ok: false, errors };
}
