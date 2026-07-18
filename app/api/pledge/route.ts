import { NextResponse } from 'next/server';
import { getWixApiClient } from '@/app/model/wix-api-client';
import { COLLECTIONS } from '@/app/model/collections';
import { getPublishedEventBySlug } from '@/app/model/invite/get-event.server';
import { validatePledgeInput } from '@/app/model/invite/invite.validation';

/**
 * Record a guest pledge (a self-reported intent to contribute — Wrappit never
 * handles funds). Written via the trusted API-key client. A pledge can stand
 * alone, so `rsvpId` is optional; the invite slug is resolved to a published
 * event and stored as `eventId`, matching the collection schema.
 */
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = validatePledgeInput(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  try {
    const event = await getPublishedEventBySlug(result.data.slug);
    if (!event) {
      return NextResponse.json({ error: 'This invite is no longer available.' }, { status: 404 });
    }

    const admin = getWixApiClient();
    await admin.items.insert(COLLECTIONS.pledges, {
      eventId: event._id,
      contributorName: result.data.contributorName,
      amount: result.data.amount,
      ...(result.data.rsvpId ? { rsvpId: result.data.rsvpId } : {}),
      ...(result.data.method ? { method: result.data.method } : {}),
      ...(result.data.note ? { note: result.data.note } : {}),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('Failed to save pledge', err);
    return NextResponse.json({ error: 'Could not save your pledge. Please try again.' }, { status: 500 });
  }
}
