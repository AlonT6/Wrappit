'use client';

import { useQuery } from '@tanstack/react-query';
import { getBrowserWixClient } from '@/app/model/auth/wix-client.browser';
import { COLLECTIONS } from '@/app/model/collections';
import type { WrappitEvent } from '@/app/model/events/event.types';

export function eventQueryKey(id: string) {
  return ['event', id] as const;
}

/** Fetch a single event the member owns. Returns null if missing / not theirs. */
async function fetchEvent(id: string): Promise<WrappitEvent | null> {
  const client = getBrowserWixClient();
  if (!client) return null;
  try {
    const res = (await client.items.get(COLLECTIONS.events, id)) as
      | WrappitEvent
      | { dataItem?: WrappitEvent }
      | null;
    if (!res) return null;
    const item = '_id' in res ? res : res.dataItem;
    return (item ?? null) as WrappitEvent | null;
  } catch {
    return null;
  }
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventQueryKey(id),
    queryFn: () => fetchEvent(id),
    enabled: Boolean(id),
    retry: false,
  });
}
