'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { members } from '@wix/members';
import { getBrowserWixClient } from '@/app/model/auth/wix-client.browser';

export type Member = members.Member;

export const currentMemberQueryKey = ['current-member'] as const;

/**
 * The logged-in organizer, or null for an anonymous visitor.
 * `getCurrentMember` throws for a visitor session, so we treat any failure as "not a member".
 */
async function fetchCurrentMember(): Promise<Member | null> {
  const client = getBrowserWixClient();
  if (!client) return null;
  try {
    const { member } = await client.members.getCurrentMember();
    return member ?? null;
  } catch {
    return null;
  }
}

export function useCurrentMember() {
  return useQuery({
    queryKey: currentMemberQueryKey,
    queryFn: fetchCurrentMember,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Refresh the cached member after login/logout. */
export function useRefreshCurrentMember() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: currentMemberQueryKey });
}
