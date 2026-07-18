import 'server-only';
import { getWixApiClient } from '@/app/model/wix-api-client';
import { COLLECTIONS } from '@/app/model/collections';
import type { WrappitEvent } from '@/app/model/events/event.types';

/**
 * Look up a published event by its public invite slug, using the trusted
 * API-key client (guests never authenticate, and the collection stays private).
 * Returns the full row — including `_id`, needed to link RSVP/pledge rows — or
 * null when the slug is unknown or the event is still a draft. Only published
 * events are ever exposed to guests.
 */
export async function getPublishedEventBySlug(slug: string): Promise<WrappitEvent | null> {
  const clean = typeof slug === 'string' ? slug.trim() : '';
  if (!clean) return null;

  const admin = getWixApiClient();
  const res = await admin.items.query(COLLECTIONS.events).eq('inviteSlug', clean).find();
  const row = (res.items?.[0] ?? null) as WrappitEvent | null;
  if (!row || row.status !== 'published') return null;
  return row;
}
