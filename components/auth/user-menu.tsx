'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/model/auth/auth.actions';
import {
  useCurrentMember,
  useRefreshCurrentMember,
} from '@/app/model/auth/use-current-member';

/** Shows the signed-in organizer's email and a log-out button. */
export function UserMenu() {
  const router = useRouter();
  const { data: member } = useCurrentMember();
  const refreshMember = useRefreshCurrentMember();
  const [pending, setPending] = useState(false);

  const label =
    member?.profile?.nickname ||
    member?.contact?.firstName ||
    member?.loginEmail ||
    'Account';

  async function handleLogout() {
    setPending(true);
    await signOut();
    await refreshMember();
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">{label}</span>
      <Button variant="outline" size="sm" onClick={handleLogout} disabled={pending}>
        {pending ? 'Logging out…' : 'Log out'}
      </Button>
    </div>
  );
}
