'use client';

import { useQuery } from '@tanstack/react-query';
import { getBrowserWixClient } from '@/app/model/auth/wix-client.browser';
import { COLLECTIONS } from '@/app/model/collections';
import type { WrappitEvent } from '@/app/model/events/event.types';

export const myEventsQueryKey = ['my-events'] as const;

/**
 * The organizer's own events. The member's OAuth session + the collection's
 * "Site Member Author" read permission scope the query to rows they own, so no
 * explicit owner filter is needed. Wix Data returns newest-first by default.
 */
async function fetchMyEvents(): Promise<WrappitEvent[]> {
  const client = getBrowserWixClient();
  if (!client) return [];
  const res = await client.items.query(COLLECTIONS.events).find();
  return (res.items ?? []) as WrappitEvent[];
}

export function useMyEvents() {
  return useQuery({
    queryKey: myEventsQueryKey,
    queryFn: fetchMyEvents,
    staleTime: 30 * 1000,
    retry: false,
  });
}
