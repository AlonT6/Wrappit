'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentMember } from '@/app/model/auth/use-current-member';
import { useMyEvents } from '@/app/model/events/use-my-events';
import type { WrappitEvent } from '@/app/model/events/event.types';

function formatDate(value?: string): string {
  if (!value) return 'Date TBD';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function EventRow({ event }: { event: WrappitEvent }) {
  return (
    <Link href={`/events/${event._id}`} className="block">
      <Card className="transition-colors hover:bg-muted/40">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex flex-col">
            <span className="font-medium">{event.childName || 'Untitled event'}</span>
            <span className="text-sm text-muted-foreground">{formatDate(event.partyDate)}</span>
          </div>
          <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {event.status ?? 'draft'}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: member } = useCurrentMember();
  const { data: events, isLoading } = useMyEvents();
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
        <Button render={<Link href="/events/new" />}>New event</Button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading your events…</p>
      ) : events && events.length > 0 ? (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <EventRow key={event._id} event={event} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-3xl">🎂</span>
            <p className="font-medium">No events yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              When you create a birthday event, it will show up here.
            </p>
            <Button render={<Link href="/events/new" />}>Create your first event</Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
