import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerWixClient } from '@/app/model/auth/wix-client.server';
import { getWixApiClient } from '@/app/model/wix-api-client';
import { COLLECTIONS } from '@/app/model/collections';
import { validateEventInput } from '@/app/model/events/event.validation';
import { generateInviteSlug } from '@/app/model/events/event.slug';

/** Wix Data admin client used only to check slug uniqueness across ALL members. */
type AdminClient = ReturnType<typeof getWixApiClient>;

/** Find an invite slug not already used by any event (admin can see every row). */
async function uniqueInviteSlug(admin: AdminClient, childName: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = generateInviteSlug(childName);
    const existing = await admin.items.query(COLLECTIONS.events).eq('inviteSlug', slug).find();
    if ((existing.items?.length ?? 0) === 0) return slug;
  }
  // Astronomically unlikely; stack two suffixes rather than loop forever.
  return `${generateInviteSlug(childName)}-${generateInviteSlug(childName)}`;
}

/**
 * Create an event owned by the calling member.
 *
 * Ownership is enforced by writing through the member's own OAuth session, so
 * Wix Data stamps `_owner` with their member id (collection permission:
 * "Site Member Author"). Slug uniqueness is checked with the admin API-key
 * client since a member can only read their own rows.
 */
export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'You must be logged in to create an event.' }, { status: 401 });
  }

  // Validate the payload.
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const result = validateEventInput(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  // Generate a unique invite slug, then write as the member.
  try {
    const admin = getWixApiClient();
    const inviteSlug = await uniqueInviteSlug(admin, result.data.childName);
    const created = await memberClient.items.insert(COLLECTIONS.events, {
      ...result.data,
      inviteSlug,
    });
    // Tolerate either the classic (item) or wrapped ({ dataItem }) return shape.
    const event = (created && '_id' in created ? created : created?.dataItem) ?? created;
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('Failed to create event', err);
    // TEMP DIAGNOSTIC: surface the underlying cause (remove before final submit).
    const detail =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err
          ? JSON.stringify(err)
          : String(err);
    return NextResponse.json(
      { error: 'Could not create the event. Please try again.', detail },
      { status: 500 },
    );
  }
}
