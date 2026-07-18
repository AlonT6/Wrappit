'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEvent } from '@/app/model/events/use-event';
import { useEventSummary } from '@/app/model/events/use-event-summary';
import { buildShareText } from '@/app/model/events/share-text';
import type { WrappitEvent } from '@/app/model/events/event.types';
import type { EventSummary, Pledge, Rsvp } from '@/app/model/invite/invite.types';

// partyDate is typed as an ISO yyyy-mm-dd string, but Wix Data returns date-type
// columns as Date objects — so handle both, and never fall through returning a
// non-string (a raw Date rendered as a child throws React error #31).
function formatDate(value?: string | Date): string {
  if (!value) return 'Date TBD';
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : 'Date TBD';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Format a self-reported pledge amount as currency (whole dollars unless cents are present). */
function formatCurrency(amount: number): string {
  const cents = Math.round(amount * 100) % 100;
  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents === 0 ? 0 : 2,
  });
}

/** A button that copies `value` to the clipboard and briefly confirms. */
function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable (insecure context) — the text is still shown to copy manually
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? 'Copied!' : label}
    </Button>
  );
}

/** The shareable public invite link, with a copy button and a draft warning. */
function InviteLinkCard({ slug, published }: { slug: string; published: boolean }) {
  // Built on the client so it reflects the actual origin (localhost vs. Netlify).
  const url = typeof window === 'undefined' ? `/i/${slug}` : `${window.location.origin}/i/${slug}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite link</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {published ? (
          <p className="text-sm text-muted-foreground">Share this link so guests can RSVP and pledge:</p>
        ) : (
          <p className="text-sm text-destructive">
            This event is a draft — the invite link won&apos;t work until you publish it.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-sm">{url}</code>
          <div className="flex gap-2">
            <CopyButton value={url} />
            {published ? (
              <Button type="button" variant="ghost" size="sm" render={<a href={url} target="_blank" rel="noreferrer" />}>
                Open
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** The gift fund: the summed pledge total plus a per-contributor breakdown. */
function GiftFundCard({ pledges, pledgeTotal }: { pledges: Pledge[]; pledgeTotal: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gift fund</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-3xl font-semibold tracking-tight">{formatCurrency(pledgeTotal)}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            pledged{pledges.length > 0 ? ` · ${pledges.length} ${pledges.length === 1 ? 'contribution' : 'contributions'}` : ''}
          </span>
        </div>
        {pledges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pledges yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {pledges.map((p) => (
              <li key={p._id} className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{p.contributorName}</span>
                  {p.method ? <span className="text-xs text-muted-foreground">via {p.method}</span> : null}
                  {p.note ? <span className="text-xs text-muted-foreground italic">“{p.note}”</span> : null}
                </div>
                <span className="text-sm font-medium tabular-nums">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** The RSVP list with attending/not-attending counts and full guest contact details. */
function RsvpListCard({
  rsvps,
  attendingCount,
  notAttendingCount,
}: {
  rsvps: Rsvp[];
  attendingCount: number;
  notAttendingCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVPs</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {attendingCount} attending · {notAttendingCount} can&apos;t make it
        </p>
        {rsvps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No RSVPs yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {rsvps.map((r) => (
              <li key={r._id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{r.inviteeName}</span>
                  <span
                    className={
                      r.status === 'yes'
                        ? 'text-xs font-medium text-green-600 dark:text-green-500'
                        : 'text-xs font-medium text-muted-foreground'
                    }
                  >
                    {r.status === 'yes' ? 'Attending' : "Can't make it"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {[r.parentName, r.parentName2].filter(Boolean).join(' & ')}
                </span>
                {r.parentEmail || r.parentPhone ? (
                  <span className="text-xs text-muted-foreground">
                    {[r.parentEmail, r.parentPhone].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
                {r.dietary ? (
                  <span className="text-xs text-muted-foreground">Dietary: {r.dietary}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Loads the organizer rollup and renders the gift-fund + RSVP cards (with loading/error states). */
function GuestActivity({ eventId }: { eventId: string }) {
  const { data: summary, isLoading, isError } = useEventSummary(eventId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading RSVPs and pledges…
        </CardContent>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load RSVPs and pledges. Please refresh to try again.
        </CardContent>
      </Card>
    );
  }

  const { rsvps, pledges, pledgeTotal, attendingCount, notAttendingCount } = summary as EventSummary;
  return (
    <>
      <GiftFundCard pledges={pledges} pledgeTotal={pledgeTotal} />
      <RsvpListCard rsvps={rsvps} attendingCount={attendingCount} notAttendingCount={notAttendingCount} />
    </>
  );
}

/** A pre-written invite message the organizer can copy and paste anywhere. */
function ShareTextCard({ event }: { event: WrappitEvent }) {
  const url =
    typeof window === 'undefined'
      ? `/i/${event.inviteSlug}`
      : `${window.location.origin}/i/${event.inviteSlug}`;
  const text = buildShareText(event, url);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested share text</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="whitespace-pre-wrap rounded bg-muted px-3 py-2 text-sm">{text}</p>
        <div>
          <CopyButton value={text} label="Copy message" />
        </div>
      </CardContent>
    </Card>
  );
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

export function EventDetail({ event }: { event: WrappitEvent }) {
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

      <GuestActivity eventId={event._id} />

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

      <InviteLinkCard slug={event.inviteSlug} published={event.status === 'published'} />

      <ShareTextCard event={event} />
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
