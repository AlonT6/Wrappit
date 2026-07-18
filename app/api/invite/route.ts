import { NextResponse } from 'next/server';
import { getPublishedEventBySlug } from '@/app/model/invite/get-event.server';
import { toPublicEvent } from '@/app/model/invite/to-public-event';

/**
 * Public invite read. Returns the guest-safe projection of a published event by
 * its invite slug, or 404 for an unknown / draft slug. Uses the trusted API-key
 * client so the `events` collection never needs to be opened to "Anyone".
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';

  try {
    const event = await getPublishedEventBySlug(slug);
    if (!event) {
      return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    }
    return NextResponse.json({ event: toPublicEvent(event) });
  } catch (err) {
    console.error('Failed to load invite', err);
    return NextResponse.json({ error: 'Could not load the invite.' }, { status: 500 });
  }
}
