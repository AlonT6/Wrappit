'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEvent } from '@/app/model/events/use-event';
import type { WrappitEvent } from '@/app/model/events/event.types';

// partyDate is typed as an ISO yyyy-mm-dd string, but Wix Data returns date-type
// columns as Date objects — so handle both, and never fall through returning a
// non-string (a raw Date rendered as a child throws React error #31).
function formatDate(value?: string | Date): string {
  if (!value) return 'Date TBD';
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : 'Date TBD';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function EventDetail({ event }: { event: WrappitEvent }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {event.childName}&apos;s birthday
          </h1>
          <span className="text-sm text-muted-foreground capitalize">{event.status} event</span>
        </div>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Party details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" value={formatDate(event.partyDate)} />
          <Field label="Time" value={event.partyTime} />
          <Field label="Location" value={event.location} />
          <Field label="Gender" value={event.gender} />
          <div className="sm:col-span-2">
            <Field label="Description" value={event.description} />
          </div>
        </CardContent>
      </Card>

      {event.paymentLinks && event.paymentLinks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Payment links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {event.paymentLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {link.label || link.type} — {link.url}
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Invite link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Guests will RSVP and pledge at this address (coming in the next phase):
          </p>
          <code className="rounded bg-muted px-2 py-1 text-sm">/i/{event.inviteSlug}</code>
        </CardContent>
      </Card>
    </main>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: event, isLoading } = useEvent(id);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <span className="text-sm text-muted-foreground">Loading event…</span>
      </div>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-4 px-6 py-24 text-center">
        <p className="text-lg font-medium">Event not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted, or it belongs to another account.
        </p>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </main>
    );
  }

  return <EventDetail event={event} />;
}
