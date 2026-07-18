import { NextResponse } from 'next/server';
import { getWixApiClient } from '@/app/model/wix-api-client';
import { COLLECTIONS } from '@/app/model/collections';
import { getPublishedEventBySlug } from '@/app/model/invite/get-event.server';
import { validateRsvpInput } from '@/app/model/invite/invite.validation';

/**
 * Record a guest RSVP. Guests never authenticate: the row is written via the
 * trusted API-key client. The invite slug is resolved to a published event
 * server-side (so a pledge can't be attached to an unknown/draft event), and
 * only `eventId` — never the raw slug — is stored, matching the collection schema.
 */
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = validateRsvpInput(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  try {
    const event = await getPublishedEventBySlug(result.data.slug);
    if (!event) {
      return NextResponse.json({ error: 'This invite is no longer available.' }, { status: 404 });
    }

    const admin = getWixApiClient();
    const created = await admin.items.insert(COLLECTIONS.rsvps, {
      eventId: event._id,
      status: result.data.attending ? 'yes' : 'no',
      inviteeName: result.data.inviteeName,
      parentName: result.data.parentName,
      ...(result.data.parentName2 ? { parentName2: result.data.parentName2 } : {}),
      ...(result.data.parentEmail ? { parentEmail: result.data.parentEmail } : {}),
      ...(result.data.parentPhone ? { parentPhone: result.data.parentPhone } : {}),
      ...(result.data.dietary ? { dietary: result.data.dietary } : {}),
    });

    const rsvpId = (created && '_id' in created ? created._id : created?.dataItem?._id) ?? '';
    return NextResponse.json({ rsvpId }, { status: 201 });
  } catch (err) {
    console.error('Failed to save RSVP', err);
    return NextResponse.json({ error: 'Could not save your RSVP. Please try again.' }, { status: 500 });
  }
}
