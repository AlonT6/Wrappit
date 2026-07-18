'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentMember } from '@/app/model/auth/use-current-member';

/**
 * Client-side gate for organizer-only areas. While the session resolves we show a
 * spinner; an anonymous visitor is redirected to /login (with a redirect back).
 */
export function RequireMember({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: member, isFetching } = useCurrentMember();

  // Gate on isFetching (not isLoading): after login the member query is stale with a
  // cached visitor `null`, so isLoading is false while a refetch is still in flight.
  // Redirecting on that stale null would bounce a real member back to /login.
  useEffect(() => {
    if (!isFetching && !member) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isFetching, member, pathname, router]);

  if (isFetching || !member) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}
