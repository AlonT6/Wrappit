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
  const { data: member, isLoading } = useCurrentMember();

  useEffect(() => {
    if (!isLoading && !member) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, member, pathname, router]);

  if (isLoading || !member) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}
