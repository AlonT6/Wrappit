'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentMember } from '@/app/model/auth/use-current-member';
import { getEventSummary } from '@/app/model/events/get-event-summary';

export function eventSummaryQueryKey(id: string) {
  return ['event-summary', id] as const;
}

/**
 * Load the organizer rollup for an event. Gated to the authenticated member by
 * the route itself; the cache is keyed by member id (like `useEvent`) so a second
 * login on the same browser can't read the previous member's cached summary.
 */
export function useEventSummary(eventId: string) {
  const { data: member } = useCurrentMember();
  const memberId = member?._id ?? null;
  return useQuery({
    queryKey: [...eventSummaryQueryKey(eventId), memberId],
    queryFn: async () => {
      const result = await getEventSummary(eventId);
      if (!result.ok) throw new Error(result.errors[0] ?? 'Failed to load the event summary.');
      return result.summary;
    },
    enabled: Boolean(eventId) && Boolean(memberId),
    retry: false,
  });
}
