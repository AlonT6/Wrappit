'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentMember } from '@/app/model/auth/use-current-member';

export default function DashboardPage() {
  const { data: member } = useCurrentMember();
  const firstName = member?.contact?.firstName;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? `Welcome, ${firstName}` : 'Your events'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a birthday event and start collecting RSVPs and pledges.
          </p>
        </div>
        {/* Wired up in Phase 2 */}
        <Button disabled>New event</Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-3xl">🎂</span>
          <p className="font-medium">No events yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            When you create a birthday event, it will show up here.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
