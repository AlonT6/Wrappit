'use client';

import { useQuery } from '@tanstack/react-query';
import { getBrowserWixClient } from '@/app/model/auth/wix-client.browser';
import { useCurrentMember } from '@/app/model/auth/use-current-member';
import { COLLECTIONS } from '@/app/model/collections';
import type { WrappitEvent } from '@/app/model/events/event.types';

export function eventQueryKey(id: string) {
  return ['event', id] as const;
}

/**
 * Fetch a single event the member owns. Returns null if missing / not theirs.
 * A raw `_id` lookup would otherwise be gated only by the collection permission,
 * so we assert `_owner` === the current member id in code as well.
 */
async function fetchEvent(id: string, memberId: string | null): Promise<WrappitEvent | null> {
  if (!memberId) return null;
  const client = getBrowserWixClient();
  if (!client) return null;
  try {
    const res = (await client.items.get(COLLECTIONS.events, id)) as
      | WrappitEvent
      | { dataItem?: WrappitEvent }
      | null;
    if (!res) return null;
    const item = ('_id' in res ? res : res.dataItem) as WrappitEvent | undefined;
    if (!item || item._owner !== memberId) return null;
    return item;
  } catch {
    return null;
  }
}

export function useEvent(id: string) {
  const { data: member } = useCurrentMember();
  const memberId = member?._id ?? null;
  return useQuery({
    // Key by member id so a cached event isn't served to a different member.
    queryKey: [...eventQueryKey(id), memberId],
    queryFn: () => fetchEvent(id, memberId),
    enabled: Boolean(id),
    retry: false,
  });
}
