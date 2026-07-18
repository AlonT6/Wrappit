import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerWixClient } from '@/app/model/auth/wix-client.server';
import { getWixApiClient } from '@/app/model/wix-api-client';
import { COLLECTIONS } from '@/app/model/collections';
import type { WrappitEvent } from '@/app/model/events/event.types';
import type { EventSummary, Pledge, Rsvp } from '@/app/model/invite/invite.types';

/**
 * Organizer rollup for a single event: the RSVP list, the pledge list, and the
 * summed pledge total.
 *
 * Two clients, on purpose:
 *  - the cookie OAuth client authenticates *who* is asking (the member), and
 *  - the admin API-key client reads the Private `rsvps`/`pledges` rows the member
 *    client has no permission to see.
 *
 * The admin client bypasses all Wix permissions, so the `event._owner === memberId`
 * ownership check below is the ONLY thing keeping one organizer from reading
 * another's guest data. A non-owner (or unknown id) gets a 404 — not 403 — so we
 * don't leak whether another member's event exists.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const memberClient = getServerWixClient(await cookies());
  if (!memberClient) {
    return NextResponse.json({ error: 'Wix client is not configured.' }, { status: 500 });
  }

  // Authenticate the organizer.
  let memberId: string | undefined;
  try {
    const { member } = await memberClient.members.getCurrentMember();
    memberId = member?._id ?? undefined;
  } catch {
    memberId = undefined;
  }
  if (!memberId) {
    return NextResponse.json({ error: 'You must be logged in to view this event.' }, { status: 401 });
  }

  try {
    const admin = getWixApiClient();

    // Load the event via the admin client, then gate on ownership.
    const got = (await admin.items.get(COLLECTIONS.events, id)) as
      | WrappitEvent
      | { dataItem?: WrappitEvent }
      | null;
    const event = (got && '_id' in got ? got : got?.dataItem) as WrappitEvent | undefined;
    if (!event || event._owner !== memberId) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const [rsvpRes, pledgeRes] = await Promise.all([
      admin.items.query(COLLECTIONS.rsvps).eq('eventId', id).find(),
      admin.items.query(COLLECTIONS.pledges).eq('eventId', id).find(),
    ]);

    const rsvps = (rsvpRes.items ?? []) as Rsvp[];
    const pledges = (pledgeRes.items ?? []) as Pledge[];

    const pledgeTotal = pledges.reduce(
      (sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0),
      0,
    );
    const attendingCount = rsvps.filter((r) => r.status === 'yes').length;
    const notAttendingCount = rsvps.filter((r) => r.status === 'no').length;

    const summary: EventSummary = { rsvps, pledges, pledgeTotal, attendingCount, notAttendingCount };
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error('Failed to load event summary', err);
    return NextResponse.json({ error: 'Could not load the event summary. Please try again.' }, { status: 500 });
  }
}
