'use client';

import { useQuery } from '@tanstack/react-query';
import { getBrowserWixClient } from '@/app/model/auth/wix-client.browser';
import { useCurrentMember } from '@/app/model/auth/use-current-member';
import { COLLECTIONS } from '@/app/model/collections';
import type { WrappitEvent } from '@/app/model/events/event.types';

export const myEventsQueryKey = ['my-events'] as const;

/**
 * The organizer's own events, explicitly scoped to rows they own
 * (`_owner` === their member id). Defense-in-depth: tenant isolation is enforced
 * here in code, not left to rely solely on the collection's "Site Member Author"
 * read permission. Wix stamps `_owner` with the creating member's id (events are
 * inserted through the member's OAuth session), which is the same value
 * `getCurrentMember()._id` returns. Wix Data returns newest-first by default.
 */
async function fetchMyEvents(memberId: string | null): Promise<WrappitEvent[]> {
  if (!memberId) return [];
  const client = getBrowserWixClient();
  if (!client) return [];
  const res = await client.items.query(COLLECTIONS.events).eq('_owner', memberId).find();
  return (res.items ?? []) as WrappitEvent[];
}

export function useMyEvents() {
  const { data: member } = useCurrentMember();
  const memberId = member?._id ?? null;
  return useQuery({
    // Key by member id so a second login on the same browser can't read the
    // previous member's cached rows.
    queryKey: [...myEventsQueryKey, memberId],
    queryFn: () => fetchMyEvents(memberId),
    staleTime: 30 * 1000,
    retry: false,
  });
}
